import { A, useLocation } from "@solidjs/router";
import { For, Show } from "solid-js";
import { isBrowserPreview } from "~/utils/browser-preview";
import IconLucideCircleHelp from "~icons/lucide/circle-help";
import IconLucideCloud from "~icons/lucide/cloud";
import IconLucideFolder from "~icons/lucide/folder";
import IconLucideVideo from "~icons/lucide/video";

const navigationItems = [
	{
		href: "/",
		label: "Recorder",
		icon: IconLucideVideo,
	},
	{
		href: "/settings/recordings",
		label: "Course Library",
		icon: IconLucideFolder,
	},
	{
		href: "/settings/integrations/google-drive-config",
		label: "Google Drive",
		icon: IconLucideCloud,
	},
	{
		href: "/settings/how-to",
		label: "How To",
		icon: IconLucideCircleHelp,
	},
] as const;

export function BrowserPreviewNavigation() {
	const location = useLocation();
	const isActive = (href: string) =>
		href === "/"
			? location.pathname === href
			: location.pathname.startsWith(href);

	return (
		<Show
			when={isBrowserPreview() && !location.pathname.startsWith("/settings")}
		>
			<nav class="fixed bottom-5 left-5 z-[100] w-48 rounded-xl border border-gray-4 bg-gray-2/95 p-2 shadow-xl backdrop-blur-xl">
				<div class="px-2 pb-2 pt-1">
					<p class="text-[11px] font-medium uppercase tracking-wide text-gray-9">
						Workspace
					</p>
					<p class="mt-0.5 text-xs text-gray-11">Cap editor preview</p>
				</div>
				<div class="mb-2 rounded-lg border border-amber-6 bg-amber-3 px-2.5 py-2">
					<p class="text-[11px] font-medium text-amber-12">Preview only</p>
					<p class="mt-0.5 text-[10px] leading-relaxed text-amber-11">
						Real recording and editing require the native desktop app.
					</p>
				</div>
				<ul class="space-y-1">
					<For each={navigationItems}>
						{(item) => (
							<li>
								<A
									href={item.href}
									end={item.href === "/"}
									class="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12"
									classList={{
										"bg-gray-5 text-gray-12": isActive(item.href),
									}}
								>
									<item.icon class="size-4 opacity-70" />
									<span>{item.label}</span>
								</A>
							</li>
						)}
					</For>
				</ul>
			</nav>
		</Show>
	);
}
