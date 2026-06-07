import type { InvokeArgs } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import type { RecordingMetaWithMetadata } from "./tauri";

const STORE_KEY = "cap-browser-preview-store";
const STORE_RID = 1;
const THUMBNAIL_DATA_URL = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
	<defs>
		<linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#4f7cff"/>
			<stop offset="1" stop-color="#8b5cf6"/>
		</linearGradient>
	</defs>
	<rect width="320" height="180" rx="16" fill="url(#background)"/>
	<circle cx="160" cy="90" r="30" fill="white" fill-opacity=".9"/>
	<path d="M153 75l22 15-22 15z" fill="#5b67e8"/>
</svg>
`)}`;

const sampleRecordings: Array<[string, RecordingMetaWithMetadata]> = [
	[
		"/preview/Introduction to Design.cap",
		{
			pretty_name: "Introduction to Design",
			mode: "studio",
			status: { status: "Complete" },
			platform: "MacOS",
			segment: {
				display: { path: "content/segments/0/display.mp4" },
			},
		},
	],
	[
		"/preview/Typography Fundamentals.cap",
		{
			pretty_name: "Typography Fundamentals",
			mode: "studio",
			status: { status: "Complete" },
			platform: "MacOS",
			segment: {
				display: { path: "content/segments/0/display.mp4" },
			},
		},
	],
	[
		"/preview/Color Theory Workshop.cap",
		{
			pretty_name: "Color Theory Workshop",
			mode: "studio",
			status: { status: "Complete" },
			platform: "MacOS",
			segment: {
				display: { path: "content/segments/0/display.mp4" },
			},
		},
	],
	[
		"/preview/Quick Course Welcome.cap",
		{
			pretty_name: "Quick Course Welcome",
			mode: "instant",
			status: { status: "Complete" },
			platform: "MacOS",
			fps: 30,
			sample_rate: 48_000,
		},
	],
];

function readStore() {
	const stored = localStorage.getItem(STORE_KEY);
	if (!stored) {
		return {
			course_library: {
				courses: [
					{
						id: "design-course",
						name: "Design Fundamentals",
						modules: [
							{ id: "getting-started", name: "Getting Started" },
							{ id: "visual-language", name: "Visual Language" },
						],
					},
				],
				assignments: {
					"/preview/Introduction to Design.cap": {
						courseId: "design-course",
						moduleId: "getting-started",
					},
					"/preview/Typography Fundamentals.cap": {
						courseId: "design-course",
						moduleId: "visual-language",
					},
				},
			},
		};
	}

	return JSON.parse(stored) as Record<string, unknown>;
}

function writeStore(store: Record<string, unknown>) {
	localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

async function handleStoreCommand(
	command: string,
	payload: InvokeArgs | undefined,
) {
	const store = readStore();
	const args =
		payload && !Array.isArray(payload)
			? (payload as Record<string, unknown>)
			: {};
	const key = args.key as string | undefined;

	switch (command) {
		case "plugin:store|load":
		case "plugin:store|get_store":
			return STORE_RID;
		case "plugin:store|get":
			return key ? [store[key], key in store] : [null, false];
		case "plugin:store|set":
			if (key) {
				store[key] = args.value;
				writeStore(store);
				await emit("store://change", {
					resourceId: STORE_RID,
					key,
					value: args.value,
					exists: true,
				});
			}
			return null;
		case "plugin:store|delete":
			if (key) {
				delete store[key];
				writeStore(store);
				await emit("store://change", {
					resourceId: STORE_RID,
					key,
					value: null,
					exists: false,
				});
			}
			return true;
		case "plugin:store|has":
			return key ? key in store : false;
		case "plugin:store|keys":
			return Object.keys(store);
		case "plugin:store|values":
			return Object.values(store);
		case "plugin:store|entries":
			return Object.entries(store);
		case "plugin:store|length":
			return Object.keys(store).length;
		case "plugin:store|clear":
			writeStore({});
			return null;
		case "plugin:store|save":
		case "plugin:store|reload":
		case "plugin:resources|close":
			return null;
		default:
			return null;
	}
}

export function initializeBrowserPreview() {
	if ("__TAURI_INTERNALS__" in window) return false;

	Object.assign(window, {
		__TAURI_OS_PLUGIN_INTERNALS__: {
			arch: "x86_64",
			eol: "\n",
			exe_extension: "",
			family: "unix",
			os_type: "linux",
			platform: "linux",
			version: "preview",
		},
	});

	mockWindows("main");
	mockIPC(
		(command, payload) => {
			if (command.startsWith("plugin:store|")) {
				return handleStoreCommand(command, payload);
			}
			if (command === "list_recordings") return sampleRecordings;
			if (command === "plugin:app|version") return "0.5.1-preview";
			if (command === "plugin:updater|check") return null;
			if (command.startsWith("plugin:dialog|")) return false;
			if (command.startsWith("plugin:shell|")) return null;
			if (command.startsWith("plugin:fs|")) return null;
			if (command.startsWith("plugin:clipboard-manager|")) return null;
			if (command === "plugin:window|is_resizable") return true;
			if (command === "plugin:window|is_maximized") return false;
			if (command === "plugin:window|is_maximizable") return true;
			if (command === "plugin:window|is_minimizable") return true;
			if (command === "plugin:window|is_closable") return true;
			if (command === "plugin:window|is_visible") return true;
			if (command === "plugin:window|scale_factor") return 1;
			if (command === "plugin:window|inner_size") {
				return { width: window.innerWidth, height: window.innerHeight };
			}
			if (command === "plugin:window|outer_size") {
				return { width: window.outerWidth, height: window.outerHeight };
			}
			if (command.startsWith("plugin:window|")) return null;
			if (command.startsWith("plugin:resources|")) return null;
			if (command === "get_current_recording") return null;
			if (command === "get_general_settings") return null;
			return null;
		},
		{ shouldMockEvents: true },
	);

	const internals = (
		window as typeof window & {
			__TAURI_INTERNALS__: {
				convertFileSrc?: (filePath: string, protocol?: string) => string;
			};
		}
	).__TAURI_INTERNALS__;
	internals.convertFileSrc = () => THUMBNAIL_DATA_URL;

	if (location.pathname === "/") {
		history.replaceState(null, "", "/settings/recordings");
	}

	return true;
}
