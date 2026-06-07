import { For, Show } from "solid-js";
import type { Course, CourseAssignment } from "~/store";
import {
	folderValue,
	parseFolderValue,
	UNASSIGNED_FOLDER_VALUE,
} from "~/utils/course-library";

export function CourseFolderSelect(props: {
	courses: Course[];
	assignment: CourseAssignment | undefined;
	onChange: (assignment: CourseAssignment | undefined) => void;
	class?: string;
	disabled?: boolean;
}) {
	return (
		<select
			class={`h-8 min-w-36 rounded-lg border border-gray-4 bg-gray-2 px-2 text-xs text-gray-12 outline-none transition-colors hover:border-gray-6 focus:border-blue-8 disabled:opacity-50 ${props.class ?? ""}`}
			value={folderValue(props.assignment)}
			disabled={props.disabled}
			onClick={(event) => event.stopPropagation()}
			onChange={(event) =>
				props.onChange(parseFolderValue(event.currentTarget.value))
			}
			aria-label="Course folder"
		>
			<option value={UNASSIGNED_FOLDER_VALUE}>Unassigned</option>
			<For each={props.courses}>
				{(course) => (
					<>
						<option
							value={folderValue({ courseId: course.id, moduleId: null })}
						>
							{course.name}
						</option>
						<Show when={course.modules.length > 0}>
							<optgroup label={course.name}>
								<For each={course.modules}>
									{(module) => (
										<option
											value={folderValue({
												courseId: course.id,
												moduleId: module.id,
											})}
										>
											{module.name}
										</option>
									)}
								</For>
							</optgroup>
						</Show>
					</>
				)}
			</For>
		</select>
	);
}
