import { A } from "@solidjs/router";
import { For } from "solid-js";
import IconLucideCloud from "~icons/lucide/cloud";
import IconLucideDownload from "~icons/lucide/download";
import IconLucideFolder from "~icons/lucide/folder";
import IconLucideImport from "~icons/lucide/import";
import IconLucideMonitor from "~icons/lucide/monitor";
import IconLucideScissors from "~icons/lucide/scissors";
import IconLucideShare2 from "~icons/lucide/share-2";
import IconLucideSquarePlay from "~icons/lucide/square-play";
import IconLucideTerminal from "~icons/lucide/terminal";
import IconLucideVideo from "~icons/lucide/video";
import { Section, SectionCard, SettingsPageContent } from "./Setting";

const guides = [
	{
		id: "vscode-preview",
		title: "Run Cap in the VS Code editor",
		description:
			"This project is configured to start its browser preview automatically when you open the folder in VS Code.",
		icon: IconLucideTerminal,
		steps: [
			"Open the Cap project folder in VS Code.",
			"If VS Code asks whether automatic tasks are allowed, choose Allow.",
			"Wait for the Cap: Desktop Preview task to start. It runs the existing Cap desktop web UI on port 3002.",
			"VS Code should open Cap in an editor Preview tab automatically.",
			"If the preview does not open, open the Ports panel, find port 3002, and choose Open in Preview.",
			"You can also open http://127.0.0.1:3002 inside VS Code's Simple Browser.",
			"Keep the preview task running while you edit. Changes should appear automatically.",
			"Remember that screen recording, camera access, file dialogs, and Google sign-in require the rebuilt Tauri desktop app. The editor preview simulates native features so you can inspect the UI.",
		],
	},
	{
		id: "record",
		title: "Record your screen",
		description:
			"Use Studio mode when you want to edit the recording afterward.",
		icon: IconLucideMonitor,
		steps: [
			"Open the main Cap recorder window.",
			"Choose Studio mode at the top of the recorder.",
			"Choose Display for your whole screen, Window for one app, or Area for part of the screen.",
			"Choose your microphone, camera, and system audio if you want to include them.",
			"Click Start Recording in Cap's recording overlay.",
			"When you are finished, click Stop Recording. A Studio recording opens in the Cap editor automatically.",
		],
	},
	{
		id: "edit-recording",
		title: "Edit a recording",
		description:
			"Cap keeps the original project while you make visual and timeline changes.",
		icon: IconLucideScissors,
		steps: [
			"Open Course Library and select the recording you want to edit.",
			"Click Open Editor for a Studio recording.",
			"Use the timeline at the bottom to move through the video.",
			"Press C at the playhead to split a clip. Select an unwanted clip and press Delete or Backspace to remove it.",
			"Use the right-side controls for background, camera, audio, cursor, keyboard overlays, and captions.",
			"Use Undo and Redo at the top if you make a mistake.",
		],
	},
	{
		id: "import",
		title: "Edit a video you already have",
		description:
			"Import an existing video and edit it with Cap's normal editor.",
		icon: IconLucideImport,
		steps: [
			"Open the main Cap recorder window.",
			"Click the Recordings button near the top-right.",
			"Click Import and choose the video file from your computer.",
			"Wait for Cap to prepare the video. The Cap editor opens when it is ready.",
			"Edit the imported video with the same timeline, background, audio, captions, and export tools.",
		],
	},
	{
		id: "folders",
		title: "Organize videos into courses",
		description:
			"Course Library adds organization without moving or changing Cap project files.",
		icon: IconLucideFolder,
		steps: [
			"Open Course Library from the sidebar.",
			"Enter a course name and click the folder-plus button.",
			"Select the course, enter a module name, and click the plus button.",
			"Use the folder menu beside any recording to assign it to a course or module.",
			"Select a course or module in the left panel to see only its videos.",
			"You can also choose a Course Folder from the Export page before finishing a video.",
		],
	},
	{
		id: "export",
		title: "Export your finished video",
		description: "Export creates a finished video file from your Cap project.",
		icon: IconLucideDownload,
		steps: [
			"Open your project in the Cap editor.",
			"Click Export in the top-right corner.",
			"Choose your course folder, file format, resolution, frame rate, and other options.",
			"Start the export and wait for Cap to finish rendering.",
			"Open the exported file or its folder when the export is complete.",
		],
	},
	{
		id: "share",
		title: "Share a video",
		description:
			"Sharing uploads a video and gives you a link you can send to someone.",
		icon: IconLucideShare2,
		steps: [
			"Sign in to Cap.",
			"Open a recording in the editor.",
			"Use the Share button when it is available, or enable a shareable link during export.",
			"Wait for the upload to finish, then copy the link.",
			"Instant mode is useful when you want a shareable recording quickly and do not need the full Studio editing workflow.",
		],
	},
	{
		id: "drive",
		title: "Use Google Drive",
		description:
			"Google Drive stores new shareable uploads in a private Cap folder in your Drive.",
		icon: IconLucideCloud,
		steps: [
			"Open Google Drive from the sidebar.",
			"Sign in to Cap and make sure Google OAuth is configured on your Cap server.",
			"Click Connect Google Drive and finish the Google permission screen in your browser.",
			"Return to Cap and click Refresh if the connection does not appear immediately.",
			"Click Use Google Drive to make it active for new uploads.",
			"Use Test to confirm the connection. Existing videos keep their current storage location.",
		],
	},
] as const;

const quickLinks = [
	{
		href: "/settings/recordings",
		label: "Open Course Library",
		icon: IconLucideSquarePlay,
	},
	{
		href: "/settings/integrations/google-drive-config",
		label: "Set Up Google Drive",
		icon: IconLucideCloud,
	},
] as const;

export default function HowToPage() {
	return (
		<div class="cap-settings-page flex flex-col h-full custom-scroll">
			<SettingsPageContent>
				<Section
					title="How To Use Cap"
					description="A simple beginner guide for recording, editing, organizing, exporting, and sharing videos."
				>
					<SectionCard padded class="space-y-4">
						<div class="flex items-start gap-3">
							<div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-3 text-blue-11">
								<IconLucideVideo class="size-4" />
							</div>
							<div class="space-y-1">
								<p class="text-[13px] font-medium text-gray-12">
									The easiest first recording
								</p>
								<p class="text-xs leading-relaxed text-gray-10">
									Choose Studio mode, select Display, click Start Recording,
									then stop when you are done. Cap opens the editor
									automatically.
								</p>
							</div>
						</div>
						<div class="flex flex-wrap gap-2">
							<For each={quickLinks}>
								{(link) => (
									<A
										href={link.href}
										class="flex h-8 items-center gap-1.5 rounded-lg border border-gray-4 bg-gray-3 px-3 text-xs text-gray-12 transition-colors hover:bg-gray-4"
									>
										<link.icon class="size-3.5" />
										{link.label}
									</A>
								)}
							</For>
						</div>
					</SectionCard>
				</Section>

				<For each={guides}>
					{(guide) => (
						<Section title={guide.title} description={guide.description}>
							<SectionCard padded>
								<div class="flex gap-3">
									<div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-3 text-gray-11">
										<guide.icon class="size-4" />
									</div>
									<ol class="min-w-0 flex-1 space-y-3">
										<For each={guide.steps}>
											{(step, index) => (
												<li class="flex gap-3 text-xs leading-relaxed text-gray-11">
													<span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-4 text-[10px] font-medium text-gray-12">
														{index() + 1}
													</span>
													<span class="pt-0.5">{step}</span>
												</li>
											)}
										</For>
									</ol>
								</div>
							</SectionCard>
						</Section>
					)}
				</For>
			</SettingsPageContent>
		</div>
	);
}
