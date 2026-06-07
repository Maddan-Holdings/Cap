import { type CourseAssignment, courseLibraryStore } from "~/store";

export const UNASSIGNED_FOLDER_VALUE = "";

export function folderValue(assignment: CourseAssignment | undefined) {
	if (!assignment) return UNASSIGNED_FOLDER_VALUE;
	return `${assignment.courseId}:${assignment.moduleId ?? ""}`;
}

export function parseFolderValue(value: string): CourseAssignment | undefined {
	if (!value) return undefined;
	const [courseId, moduleId = ""] = value.split(":");
	if (!courseId) return undefined;
	return { courseId, moduleId: moduleId || null };
}

export async function assignRecording(
	projectPath: string,
	assignment: CourseAssignment | undefined,
) {
	const library = await courseLibraryStore.get();
	const assignments = { ...(library?.assignments ?? {}) };
	if (assignment) assignments[projectPath] = assignment;
	else delete assignments[projectPath];
	await courseLibraryStore.set({ assignments });
}

export function createCourseId() {
	return crypto.randomUUID();
}

export function createModuleId() {
	return crypto.randomUUID();
}
