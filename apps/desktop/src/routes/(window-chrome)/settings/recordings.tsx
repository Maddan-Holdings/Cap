import { Button, ProgressCircle } from "@cap/ui-solid";
import Tooltip from "@corvu/tooltip";
import {
	createMutation,
	createQuery,
	queryOptions,
	useQueryClient,
} from "@tanstack/solid-query";
import { Channel, convertFileSrc } from "@tauri-apps/api/core";
import { ask, confirm } from "@tauri-apps/plugin-dialog";
import { remove } from "@tauri-apps/plugin-fs";
import * as shell from "@tauri-apps/plugin-shell";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	type ParentProps,
	Show,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { CourseFolderSelect } from "~/components/CourseFolderSelect";
import CapTooltip from "~/components/Tooltip";
import { Input } from "~/routes/editor/ui";
import {
	type Course,
	type CourseAssignment,
	courseLibraryStore,
} from "~/store";
import { trackEvent } from "~/utils/analytics";
import {
	assignRecording,
	createCourseId,
	createModuleId,
} from "~/utils/course-library";
import { createTauriEventListener } from "~/utils/createEventListener";
import { importVideoFromPicker, showImportError } from "~/utils/importMedia";
import { openRecordingFolder } from "~/utils/recording";
import {
	commands,
	events,
	type RecordingMetaWithMetadata,
	type UploadProgress,
} from "~/utils/tauri";
import IconLucideFolderPlus from "~icons/lucide/folder-plus";
import IconLucideImport from "~icons/lucide/import";
import IconLucidePlus from "~icons/lucide/plus";
import IconLucideSearch from "~icons/lucide/search";
import IconLucideTrash2 from "~icons/lucide/trash-2";
import { Section, SettingsPageContent } from "./Setting";

type Recording = {
	meta: RecordingMetaWithMetadata;
	path: string;
	prettyName: string;
	thumbnailPath: string;
};

const Tabs = [
	{
		id: "all",
		label: "Show all",
	},
	{
		id: "instant",
		icon: <IconCapInstant class="invert size-3 dark:invert-0" />,
		label: "Instant",
	},
	{
		id: "studio",
		icon: <IconCapFilmCut class="invert size-3 dark:invert-0" />,
		label: "Studio",
	},
] satisfies { id: string; label: string; icon?: JSX.Element }[];

const PAGE_SIZE = 20;

const hasActiveRecording = (recording: Recording) => {
	const status = recording.meta.status.status;
	if (status === "InProgress" || status === "NeedsRemux") return true;
	const uploadState = recording.meta.upload?.state;
	return (
		uploadState === "MultipartUpload" || uploadState === "SinglePartUpload"
	);
};

const recordingsQuery = queryOptions<Recording[]>({
	queryKey: ["recordings"],
	queryFn: async () => {
		const result = await commands.listRecordings().catch(() => [] as const);

		const recordings = await Promise.all(
			result.map(async (file) => {
				const [path, meta] = file;
				const thumbnailPath = `${path}/screenshots/display.jpg`;

				return {
					meta,
					path,
					prettyName: meta.pretty_name,
					thumbnailPath,
				};
			}),
		);
		return recordings;
	},
	reconcile: "path",
	refetchInterval: (query) => {
		const data = query.state.data;
		if (!data) return false;
		return data.some(hasActiveRecording) ? 2000 : false;
	},
});

export default function Recordings() {
	const [activeTab, setActiveTab] = createSignal<(typeof Tabs)[number]["id"]>(
		Tabs[0].id,
	);
	const [search, setSearch] = createSignal("");
	const trimmedSearch = createMemo(() => search().trim());
	const normalizedSearch = createMemo(() => trimmedSearch().toLowerCase());
	const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
	const [selectedFolder, setSelectedFolder] = createSignal("all");
	const [newCourseName, setNewCourseName] = createSignal("");
	const [newModuleName, setNewModuleName] = createSignal("");
	const [uploadProgress, setUploadProgress] = createStore<
		Record</* video_id */ string, number>
	>({});
	const recordings = createQuery(() => recordingsQuery);
	const courseLibrary = courseLibraryStore.createQuery();
	const courses = createMemo(() => courseLibrary.data?.courses ?? []);
	const assignments = createMemo(() => courseLibrary.data?.assignments ?? {});
	const selectedCourse = createMemo(() => {
		const [kind, courseId] = selectedFolder().split(":");
		if (kind !== "course" && kind !== "module") return undefined;
		return courses().find((course) => course.id === courseId);
	});

	createTauriEventListener(events.uploadProgressEvent, (e) => {
		if (e.uploaded === "0" && e.total === "0") {
			setUploadProgress(
				produce((s) => {
					delete s[e.video_id];
				}),
			);
		} else {
			const total = Number(e.total);
			const progress = total > 0 ? (Number(e.uploaded) / total) * 100 : 0;
			setUploadProgress(e.video_id, progress);
		}
	});

	createTauriEventListener(events.recordingDeleted, () => recordings.refetch());

	createEffect(() => {
		activeTab();
		trimmedSearch();
		selectedFolder();
		setVisibleCount(PAGE_SIZE);
	});

	const filteredRecordings = createMemo(() => {
		const data = recordings.data ?? [];
		const scopedRecordings =
			activeTab() === "all"
				? data
				: data.filter((recording) => recording.meta.mode === activeTab());
		const folder = selectedFolder();
		const folderRecordings = scopedRecordings.filter((recording) => {
			if (folder === "all") return true;
			const assignment = assignments()[recording.path];
			if (folder === "unassigned") return !assignment;
			const [kind, courseId, moduleId] = folder.split(":");
			if (kind === "course")
				return assignment?.courseId === courseId && !assignment.moduleId;
			return (
				kind === "module" &&
				assignment?.courseId === courseId &&
				assignment.moduleId === moduleId
			);
		});
		const query = normalizedSearch();
		if (!query) return folderRecordings;
		return folderRecordings.filter((recording) =>
			recording.prettyName.toLowerCase().includes(query),
		);
	});

	const visibleRecordings = createMemo(() => {
		const items = filteredRecordings();
		if (normalizedSearch()) return items;
		return items.slice(0, visibleCount());
	});

	const hasMoreRecordings = createMemo(
		() => !normalizedSearch() && filteredRecordings().length > visibleCount(),
	);

	const emptyMessage = createMemo(() => {
		const tabLabel =
			activeTab() === "all" ? "recordings" : `${activeTab()} recordings`;
		const prefix = trimmedSearch() ? "No matching" : "No";
		return `${prefix} ${tabLabel}`;
	});

	const handleRecordingClick = (recording: Recording) => {
		trackEvent("recording_view_clicked");
		events.newStudioRecordingAdded.emit({ path: recording.path });
	};

	const handleOpenFolder = (recording: Recording) => {
		trackEvent("recording_folder_clicked");
		openRecordingFolder(recording.path, recording.meta.mode).catch((error) => {
			console.error("Failed to open recording folder:", error);
		});
	};

	const handleCopyVideoToClipboard = (path: string) => {
		trackEvent("recording_copy_clicked");
		commands.copyVideoToClipboard(path);
	};

	const handleOpenEditor = (path: string) => {
		trackEvent("recording_editor_clicked");
		commands.showWindow({
			Editor: { project_path: path },
		});
	};

	const handleVideoImport = async () => {
		try {
			await importVideoFromPicker();
		} catch (e) {
			console.error("Failed to import video:", e);
			await showImportError("video", e);
		}
	};

	const createCourse = async () => {
		const name = newCourseName().trim();
		if (!name) return;
		const course: Course = { id: createCourseId(), name, modules: [] };
		await courseLibraryStore.set({ courses: [...courses(), course] });
		setNewCourseName("");
		setSelectedFolder(`course:${course.id}`);
	};

	const createModule = async () => {
		const course = selectedCourse();
		const name = newModuleName().trim();
		if (!course || !name) return;
		const module = { id: createModuleId(), name };
		await courseLibraryStore.set({
			courses: courses().map((item) =>
				item.id === course.id
					? { ...item, modules: [...item.modules, module] }
					: item,
			),
		});
		setNewModuleName("");
		setSelectedFolder(`module:${course.id}:${module.id}`);
	};

	const deleteCourse = async (course: Course) => {
		if (
			!(await ask(
				`Delete "${course.name}"? Recordings will become unassigned.`,
			))
		)
			return;
		const nextAssignments = Object.fromEntries(
			Object.entries(assignments()).filter(
				([, assignment]) => assignment.courseId !== course.id,
			),
		);
		await courseLibraryStore.set({
			courses: courses().filter((item) => item.id !== course.id),
			assignments: nextAssignments,
		});
		setSelectedFolder("all");
	};

	const deleteModule = async (course: Course, moduleId: string) => {
		const module = course.modules.find((item) => item.id === moduleId);
		if (
			!module ||
			!(await ask(
				`Delete "${module.name}"? Its recordings will move to ${course.name}.`,
			))
		)
			return;
		const nextAssignments = Object.fromEntries(
			Object.entries(assignments()).map(([path, assignment]) => [
				path,
				assignment.courseId === course.id && assignment.moduleId === moduleId
					? { courseId: course.id, moduleId: null }
					: assignment,
			]),
		);
		await courseLibraryStore.set({
			courses: courses().map((item) =>
				item.id === course.id
					? {
							...item,
							modules: item.modules.filter(
								(moduleItem) => moduleItem.id !== moduleId,
							),
						}
					: item,
			),
			assignments: nextAssignments,
		});
		setSelectedFolder(`course:${course.id}`);
	};

	return (
		<div class="cap-settings-page flex relative flex-col w-full h-full custom-scroll">
			<SettingsPageContent class="max-w-none space-y-4">
				<Section
					title="Course Library"
					description="Organize recordings into courses and modules without moving the underlying Cap projects."
					right={
						<Button
							variant="gray"
							size="sm"
							class="h-[36px] px-3 shrink-0 flex items-center gap-1.5"
							onClick={handleVideoImport}
						>
							<IconLucideImport class="size-3.5" />
							<span>Import</span>
						</Button>
					}
				>
					<div class="flex min-h-[32rem] overflow-hidden rounded-xl border border-gray-3 bg-gray-2">
						<aside class="flex w-56 shrink-0 flex-col border-r border-gray-3 bg-gray-1">
							<div class="space-y-1 border-b border-gray-3 p-3">
								<LibraryFolderButton
									label="All recordings"
									selected={selectedFolder() === "all"}
									onClick={() => setSelectedFolder("all")}
								/>
								<LibraryFolderButton
									label="Unassigned"
									selected={selectedFolder() === "unassigned"}
									onClick={() => setSelectedFolder("unassigned")}
								/>
							</div>
							<div class="flex-1 space-y-1 overflow-y-auto p-3">
								<For each={courses()}>
									{(course) => (
										<div>
											<div class="group flex items-center gap-1">
												<LibraryFolderButton
													label={course.name}
													selected={selectedFolder() === `course:${course.id}`}
													onClick={() =>
														setSelectedFolder(`course:${course.id}`)
													}
												/>
												<button
													type="button"
													class="rounded-md p-1 text-gray-9 opacity-0 hover:bg-gray-3 hover:text-red-10 group-hover:opacity-100"
													onClick={() => deleteCourse(course)}
													aria-label={`Delete ${course.name}`}
												>
													<IconLucideTrash2 class="size-3.5" />
												</button>
											</div>
											<For each={course.modules}>
												{(module) => (
													<div class="group ml-4 flex items-center gap-1">
														<LibraryFolderButton
															label={module.name}
															selected={
																selectedFolder() ===
																`module:${course.id}:${module.id}`
															}
															onClick={() =>
																setSelectedFolder(
																	`module:${course.id}:${module.id}`,
																)
															}
														/>
														<button
															type="button"
															class="rounded-md p-1 text-gray-9 opacity-0 hover:bg-gray-3 hover:text-red-10 group-hover:opacity-100"
															onClick={() => deleteModule(course, module.id)}
															aria-label={`Delete ${module.name}`}
														>
															<IconLucideTrash2 class="size-3.5" />
														</button>
													</div>
												)}
											</For>
										</div>
									)}
								</For>
							</div>
							<div class="space-y-2 border-t border-gray-3 p-3">
								<div class="flex gap-1.5">
									<Input
										value={newCourseName()}
										onInput={(event) =>
											setNewCourseName(event.currentTarget.value)
										}
										onKeyDown={(event) => {
											if (event.key === "Enter") void createCourse();
										}}
										placeholder="New course"
										aria-label="New course name"
									/>
									<Button
										variant="gray"
										size="sm"
										class="h-8 px-2"
										disabled={!newCourseName().trim()}
										onClick={createCourse}
										aria-label="Create course"
									>
										<IconLucideFolderPlus class="size-3.5" />
									</Button>
								</div>
								<Show when={selectedCourse()}>
									<div class="flex gap-1.5">
										<Input
											value={newModuleName()}
											onInput={(event) =>
												setNewModuleName(event.currentTarget.value)
											}
											onKeyDown={(event) => {
												if (event.key === "Enter") void createModule();
											}}
											placeholder="New module"
											aria-label="New module name"
										/>
										<Button
											variant="gray"
											size="sm"
											class="h-8 px-2"
											disabled={!newModuleName().trim()}
											onClick={createModule}
											aria-label="Create module"
										>
											<IconLucidePlus class="size-3.5" />
										</Button>
									</div>
								</Show>
							</div>
						</aside>

						<div class="flex min-w-0 flex-1 flex-col">
							<div class="flex flex-col gap-3 border-b border-gray-3 p-4">
								<div class="flex flex-wrap gap-3 items-center">
									<For each={Tabs}>
										{(tab) => (
											<button
												type="button"
												class={cx(
													"flex gap-1.5 items-center transition-colors duration-200 p-2 px-3 border rounded-full",
													activeTab() === tab.id
														? "bg-gray-5 cursor-default border-gray-5"
														: "bg-transparent cursor-pointer hover:bg-gray-3 border-gray-5",
												)}
												onClick={() => setActiveTab(tab.id)}
											>
												{tab.icon && tab.icon}
												<span class="text-xs text-gray-12">{tab.label}</span>
											</button>
										)}
									</For>
								</div>
								<div class="relative w-full max-w-[260px] h-[36px] flex items-center">
									<IconLucideSearch class="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none size-3 text-gray-10" />
									<Input
										type="search"
										class="py-2 pl-6 h-full w-full"
										value={search()}
										onInput={(event) => setSearch(event.currentTarget.value)}
										onKeyDown={(event) => {
											if (event.key === "Escape" && search()) {
												event.preventDefault();
												setSearch("");
											}
										}}
										placeholder="Search"
										autoCapitalize="off"
										autocorrect="off"
										autocomplete="off"
										spellcheck={false}
										aria-label="Search recordings"
									/>
								</div>
							</div>

							<div class="relative flex flex-1 flex-col overflow-y-auto">
								<Show when={filteredRecordings().length === 0}>
									<p class="absolute flex h-full w-full items-center justify-center text-center text-(--text-tertiary)">
										{emptyMessage()}
									</p>
								</Show>
								<ul class="flex flex-col w-full text-(--text-primary)">
									<For each={visibleRecordings()}>
										{(recording) => (
											<RecordingItem
												recording={recording}
												courses={courses()}
												assignment={assignments()[recording.path]}
												onAssignmentChange={(assignment) =>
													assignRecording(recording.path, assignment)
												}
												onClick={() => handleRecordingClick(recording)}
												onOpenFolder={() => handleOpenFolder(recording)}
												onOpenEditor={() => handleOpenEditor(recording.path)}
												onCopyVideoToClipboard={() =>
													handleCopyVideoToClipboard(recording.path)
												}
												uploadProgress={
													recording.meta.upload &&
													(recording.meta.upload.state === "MultipartUpload" ||
														recording.meta.upload.state === "SinglePartUpload")
														? uploadProgress[recording.meta.upload.video_id]
														: undefined
												}
											/>
										)}
									</For>
								</ul>
								<Show when={hasMoreRecordings()}>
									<div class="flex justify-center p-3 border-t border-gray-3">
										<Button
											variant="gray"
											size="sm"
											onClick={() =>
												setVisibleCount((count) =>
													Math.min(
														count + PAGE_SIZE,
														filteredRecordings().length,
													),
												)
											}
										>
											Load more
										</Button>
									</div>
								</Show>
							</div>
						</div>
					</div>
				</Section>
			</SettingsPageContent>
		</div>
	);
}

function LibraryFolderButton(props: {
	label: string;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			class={cx(
				"flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs transition-colors",
				props.selected
					? "bg-gray-5 text-gray-12"
					: "text-gray-11 hover:bg-gray-3 hover:text-gray-12",
			)}
			onClick={props.onClick}
		>
			<IconLucideFolder class="size-3.5 shrink-0" />
			<span class="truncate">{props.label}</span>
		</button>
	);
}

function RecordingItem(props: {
	recording: Recording;
	courses: Course[];
	assignment: CourseAssignment | undefined;
	onAssignmentChange: (assignment: CourseAssignment | undefined) => void;
	onClick: () => void;
	onOpenFolder: () => void;
	onOpenEditor: () => void;
	onCopyVideoToClipboard: () => void;
	uploadProgress: number | undefined;
}) {
	const [imageExists, setImageExists] = createSignal(true);
	const mode = () => props.recording.meta.mode;
	const firstLetterUpperCase = () =>
		mode().charAt(0).toUpperCase() + mode().slice(1);

	const queryClient = useQueryClient();
	const studioCompleteCheck = () =>
		mode() === "studio" && props.recording.meta.status.status === "Complete";

	return (
		<li
			onClick={() => {
				if (studioCompleteCheck()) {
					props.onOpenEditor();
				}
			}}
			class={cx(
				"flex flex-row justify-between p-3 not-last:border-b not-last:border-gray-3 items-center w-full  transition-colors duration-200",
				studioCompleteCheck()
					? "cursor-pointer hover:bg-gray-3"
					: "cursor-default",
			)}
		>
			<div class="flex gap-5 items-center">
				<Show
					when={imageExists()}
					fallback={<div class="mr-4 rounded-sm bg-gray-10 size-11" />}
				>
					<img
						class="object-cover rounded-sm size-12"
						alt="Recording thumbnail"
						src={`${convertFileSrc(
							props.recording.thumbnailPath,
						)}?t=${Date.now()}`}
						onError={() => setImageExists(false)}
					/>
				</Show>
				<div class="flex flex-col gap-2">
					<span>{props.recording.prettyName}</span>
					<div class="flex space-x-1">
						<div
							class={cx(
								"px-2 py-0.5 flex items-center gap-1.5 font-medium text-[11px] text-gray-12 rounded-full w-fit",
								mode() === "instant" ? "bg-blue-100" : "bg-gray-4",
							)}
						>
							{mode() === "instant" ? (
								<IconCapInstant class="invert size-2.5 dark:invert-0" />
							) : (
								<IconCapFilmCut class="invert size-2.5 dark:invert-0" />
							)}
							<p>{firstLetterUpperCase()}</p>
						</div>

						<Show when={props.recording.meta.status.status === "InProgress"}>
							<div
								class={cx(
									"px-2 py-0.5 flex items-center gap-1.5 font-medium text-[11px] text-gray-12 rounded-full w-fit bg-blue-500 leading-none text-center",
								)}
							>
								<IconPhRecordFill class="invert size-2.5 dark:invert-0" />
								<p>Recording in progress</p>
							</div>
						</Show>

						<Show when={props.recording.meta.status.status === "Failed"}>
							<CapTooltip
								content={
									<span>
										{props.recording.meta.status.status === "Failed"
											? props.recording.meta.status.error
											: ""}
									</span>
								}
							>
								<div
									class={cx(
										"px-2 py-0.5 flex items-center gap-1.5 font-medium text-[11px] text-gray-12 rounded-full w-fit bg-red-9 leading-none text-center",
									)}
								>
									<IconPhWarningBold class="invert size-2.5 dark:invert-0" />
									<p>Recording failed</p>
								</div>
							</CapTooltip>
						</Show>
					</div>
				</div>
			</div>
			<div class="flex gap-2 items-center">
				<CourseFolderSelect
					courses={props.courses}
					assignment={props.assignment}
					onChange={props.onAssignmentChange}
					disabled={props.recording.meta.status.status === "InProgress"}
				/>
				<Show when={mode() === "studio"}>
					<Show when={props.uploadProgress}>
						<CapTooltip content={`${(props.uploadProgress || 0).toFixed(2)}%`}>
							<ProgressCircle
								variant="primary"
								progress={props.uploadProgress || 0}
								size="sm"
							/>
						</CapTooltip>
					</Show>
					<Show when={props.recording.meta.sharing}>
						{(sharing) => (
							<TooltipIconButton
								tooltipText="Open link"
								onClick={() => shell.open(sharing().link)}
							>
								<IconCapLink class="size-4" />
							</TooltipIconButton>
						)}
					</Show>
					<TooltipIconButton
						tooltipText="Edit"
						onClick={async () => {
							if (
								props.recording.meta.status.status === "Failed" &&
								!(await confirm(
									"The recording failed so this file may have issues in the editor! If your having issues recovering the file please reach out to support!",
									{
										title: "Recording is potentially corrupted",
										kind: "warning",
									},
								))
							)
								return;
							props.onOpenEditor();
						}}
						disabled={props.recording.meta.status.status === "InProgress"}
					>
						<IconLucideEdit class="size-4" />
					</TooltipIconButton>
				</Show>
				<Show when={mode() === "instant"}>
					{(_) => {
						const reupload = createMutation(() => ({
							mutationFn: () =>
								commands.uploadExportedVideo(
									props.recording.path,
									"Reupload",
									new Channel<UploadProgress>((_progress) => {}),
									null,
								),
						}));

						return (
							<>
								<Show
									when={props.uploadProgress || reupload.isPending}
									fallback={
										<TooltipIconButton
											tooltipText="Reupload"
											onClick={() => reupload.mutate()}
										>
											<IconLucideRotateCcw class="size-4" />
										</TooltipIconButton>
									}
								>
									<ProgressCircle
										variant="primary"
										progress={props.uploadProgress || 0}
										size="sm"
									/>
								</Show>

								<Show when={props.recording.meta.sharing}>
									{(sharing) => (
										<TooltipIconButton
											tooltipText="Open link"
											onClick={() => shell.open(sharing().link)}
										>
											<IconCapLink class="size-4" />
										</TooltipIconButton>
									)}
								</Show>
							</>
						);
					}}
				</Show>
				<TooltipIconButton
					tooltipText="Open recording bundle"
					onClick={() => {
						props.onOpenFolder();
					}}
				>
					<IconLucideFolder class="size-4" />
				</TooltipIconButton>
				<TooltipIconButton
					tooltipText="Delete"
					onClick={async () => {
						if (!(await ask("Are you sure you want to delete this recording?")))
							return;
						await remove(props.recording.path, { recursive: true });
						await assignRecording(props.recording.path, undefined);

						queryClient.refetchQueries(recordingsQuery);
					}}
				>
					<IconCapTrash class="size-4" />
				</TooltipIconButton>
			</div>
		</li>
	);
}

function TooltipIconButton(
	props: ParentProps<{
		onClick: () => void;
		tooltipText: string;
		disabled?: boolean;
	}>,
) {
	return (
		<Tooltip>
			<Tooltip.Trigger
				onClick={(e: MouseEvent) => {
					e.stopPropagation();
					props.onClick();
				}}
				disabled={props.disabled}
				class="p-2.5 opacity-70 will-change-transform hover:opacity-100 rounded-full transition-all duration-200 hover:bg-gray-3 dark:hover:bg-gray-5 disabled:pointer-events-none disabled:opacity-45 disabled:hover:opacity-45"
			>
				{props.children}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="py-2 px-3 font-medium bg-gray-2 text-gray-12 border border-gray-3 text-xs rounded-lg animate-in fade-in slide-in-from-top-0.5">
					{props.tooltipText}
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip>
	);
}
