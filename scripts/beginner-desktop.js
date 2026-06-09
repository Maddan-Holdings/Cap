import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const action = process.argv[2] ?? "help";
const isWindows = process.platform === "win32";
const supportedPlatforms = new Set(["darwin", "win32"]);

function print(message = "") {
	process.stdout.write(`${message}\n`);
}

function fail(message) {
	print("");
	print(`Cap could not continue: ${message}`);
	print("Open BEGINNER-DESKTOP-GUIDE.md for the full beginner checklist.");
	print("");
	process.exit(1);
}

function title(message) {
	print("");
	print(message);
	print("=".repeat(message.length));
}

function step(index, total, message) {
	print("");
	print(`Step ${index} of ${total}: ${message}`);
}

function commandExists(command) {
	const result = spawnSync(
		isWindows ? "where.exe" : "command",
		[...(isWindows ? [] : ["-v"]), command],
		{
			shell: !isWindows,
			stdio: "ignore",
		},
	);
	return result.status === 0;
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: root,
		env: process.env,
		shell: isWindows,
		stdio: "inherit",
		...options,
	});
	if (result.error) fail(result.error.message);
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function showPlatformInstructions() {
	print("The browser preview cannot record your real screen.");
	print("Cap recording requires this repository to run locally on:");
	print("  - macOS");
	print("  - Windows");
	print("");
	print(
		"This workspace is a Linux Codespace without access to your computer screen.",
	);
	print(
		"Download or clone the Cap folder to your Mac or Windows PC, open it in",
	);
	print(
		"VS Code, then choose Terminal > Run Task > Cap: 1. First-Time Desktop Setup.",
	);
	print("");
	print("Beginner guide: BEGINNER-DESKTOP-GUIDE.md");
}

function checkPlatform() {
	if (
		process.env.CODESPACES === "true" ||
		!supportedPlatforms.has(process.platform)
	) {
		showPlatformInstructions();
		process.exit(2);
	}
}

function checkNode() {
	const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
	if (major < 20) {
		fail(
			"Install Node.js 20 or newer, restart VS Code, and run this task again.",
		);
	}
	print(`Found Node.js ${process.versions.node}.`);
}

function checkRust() {
	if (!commandExists("rustc") || !commandExists("cargo")) {
		fail(
			"Install Rust from https://rustup.rs, restart VS Code, and run this task again.",
		);
	}
	const rust = spawnSync("rustc", ["--version"], {
		encoding: "utf8",
		shell: isWindows,
	});
	print(`Found ${rust.stdout.trim() || "Rust"}.`);
}

function checkSystemTools() {
	if (process.platform === "darwin" && !commandExists("xcode-select")) {
		fail(
			"Install Xcode Command Line Tools, restart VS Code, and run this task again.",
		);
	}

	if (
		process.platform === "darwin" &&
		spawnSync("xcode-select", ["-p"], { stdio: "ignore" }).status !== 0
	) {
		fail(
			"Install Xcode Command Line Tools, restart VS Code, and run this task again.",
		);
	}

	if (
		process.platform === "win32" &&
		!existsSync(
			"C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe",
		)
	) {
		fail(
			'Install Microsoft C++ Build Tools with "Desktop development with C++", restart VS Code, and run this task again.',
		);
	}
	print(
		process.platform === "darwin"
			? "Found Xcode Command Line Tools."
			: "Found Microsoft C++ Build Tools installer.",
	);
}

function ensurePnpm() {
	if (commandExists("pnpm")) {
		const pnpm = spawnSync("pnpm", ["--version"], {
			encoding: "utf8",
			shell: isWindows,
		});
		print(`Found pnpm ${pnpm.stdout.trim() || "10.5.2"}.`);
		return;
	}
	if (!commandExists("corepack")) {
		fail(
			"Install the Node.js LTS release from https://nodejs.org, restart VS Code, and run this task again.",
		);
	}

	print("Preparing pnpm...");
	run("corepack", ["enable"]);
	run("corepack", ["prepare", "pnpm@10.5.2", "--activate"]);

	if (!commandExists("pnpm")) {
		fail(
			"pnpm could not be enabled. Reinstall Node.js LTS, restart VS Code, and run this task again.",
		);
	}
}

function ensureDesktopEnvironment() {
	const envPath = resolve(root, ".env");
	if (existsSync(envPath)) return;

	writeFileSync(
		envPath,
		[
			"NODE_ENV=development",
			"RUST_BACKTRACE=1",
			"VITE_SERVER_URL=https://cap.so",
			"",
		].join("\n"),
	);
	print("Created a desktop-only .env file that points Cap at cap.so.");
}

function checkRequirements({ guided = false } = {}) {
	if (guided) print("Checking whether this computer can run Cap Desktop...");
	checkPlatform();
	checkNode();
	checkRust();
	checkSystemTools();
	ensurePnpm();
}

function installDependencies() {
	if (existsSync(resolve(root, "node_modules"))) {
		print("Cap dependencies are already installed.");
		return;
	}
	print(
		"Installing Cap dependencies. The first setup can take several minutes...",
	);
	run("pnpm", ["install"]);
}

function guide() {
	title("Cap Desktop Start Here");
	if (
		process.env.CODESPACES === "true" ||
		!supportedPlatforms.has(process.platform)
	) {
		showPlatformInstructions();
		print("");
		print("What you can do in this browser preview:");
		print("  1. Inspect the Cap UI.");
		print("  2. Open Course Library, Google Drive, and How To.");
		print("  3. Confirm the custom pages are visible.");
		print("");
		print("What you cannot do here:");
		print("  1. Record your real screen.");
		print("  2. Test microphone, camera, system audio, or native exports.");
		print("");
		print("Next step: move this repository to your Mac or Windows PC.");
		return;
	}

	print("You are on a computer that can launch Cap Desktop.");
	print("");
	print("Do this next:");
	print("  1. Choose Terminal > Run Task.");
	print("  2. Select Cap: 1. First-Time Desktop Setup.");
	print("  3. When setup finishes, choose Terminal > Run Task again.");
	print("  4. Select Cap: 2. Start Native Desktop App.");
	print("  5. Use the Cap - Development window to record.");
	print("");
	checkRequirements({ guided: true });
	print("");
	print("This computer passed the first requirements check.");
}

function setup() {
	title("Cap First-Time Desktop Setup");
	step(1, 5, "Check this computer");
	checkRequirements({ guided: true });
	step(2, 5, "Prepare the desktop app settings");
	ensureDesktopEnvironment();
	step(3, 5, "Install Cap dependencies");
	installDependencies();
	step(4, 5, "Prepare Cap's native recorder tools");
	print("Preparing Cap's native recording dependencies...");
	run("pnpm", ["cap-setup"]);
	step(5, 5, "Finish");
	print("");
	print("Setup is complete.");
	print("Next choose Terminal > Run Task > Cap: 2. Start Native Desktop App.");
}

function start() {
	title("Cap Native Desktop Launcher");
	step(1, 4, "Check this computer");
	checkRequirements({ guided: true });
	step(2, 4, "Prepare the desktop app settings");
	ensureDesktopEnvironment();
	step(3, 4, "Make sure Cap dependencies are installed");
	installDependencies();
	step(4, 4, "Open Cap");
	print("Starting the real Cap desktop app...");
	print("Keep this VS Code task running while you use Cap.");
	print("If your computer asks for Screen Recording permission, allow it.");
	print(
		"If macOS asks you to restart Cap after permission changes, close Cap and run this same task again.",
	);
	run("pnpm", ["dev:desktop"]);
	print("");
	print(
		"Cap has closed. Run this same task again whenever you want to reopen it.",
	);
}

function build() {
	title("Cap Installable App Builder");
	step(1, 4, "Check this computer");
	checkRequirements({ guided: true });
	step(2, 4, "Prepare the desktop app settings");
	ensureDesktopEnvironment();
	step(3, 4, "Make sure Cap dependencies are installed");
	installDependencies();
	step(4, 4, "Build the installer");
	print("Building an installable Cap desktop app...");
	run("pnpm", ["tauri:build"]);
	print("");
	print("Build complete. Your installer is in target/release/bundle.");
}

switch (action) {
	case "guide":
		guide();
		break;
	case "setup":
		setup();
		break;
	case "start":
		start();
		break;
	case "build":
		build();
		break;
	case "check":
		checkRequirements({ guided: true });
		print("This computer is ready to build Cap Desktop.");
		break;
	default:
		print("Use one of: guide, setup, start, build, check");
		process.exit(action === "help" ? 0 : 1);
}
