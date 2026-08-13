import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Accordion } from "@appica/ui-react/accordion";
import { AccordionContent } from "@appica/ui-react/accordion";
import { AccordionItem } from "@appica/ui-react/accordion";
import { AccordionTrigger } from "@appica/ui-react/accordion";
import { Avatar } from "@appica/ui-react/avatar";
import { AvatarBadge } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { AvatarGroup } from "@appica/ui-react/avatar";
import { AvatarImage } from "@appica/ui-react/avatar";
import { BackgroundPattern } from "@appica/ui-react/background-pattern";
import { Badge } from "@appica/ui-react/badge";
import { BorderBeam } from "@appica/ui-react/border-beam";
import { Button } from "@appica/ui-react/button";
import { buttonVariants } from "@appica/ui-react/button";
import { Chip } from "@appica/ui-react/chip";
import { Dialog } from "@appica/ui-react/dialog";
import { DialogBody } from "@appica/ui-react/dialog";
import { DialogContent } from "@appica/ui-react/dialog";
import { DialogDescription } from "@appica/ui-react/dialog";
import { DialogHeader } from "@appica/ui-react/dialog";
import { DialogTitle } from "@appica/ui-react/dialog";
import { Drawer } from "@appica/ui-react/drawer";
import { DrawerBody } from "@appica/ui-react/drawer";
import { DrawerContent } from "@appica/ui-react/drawer";
import { DrawerHeader } from "@appica/ui-react/drawer";
import { DrawerTitle } from "@appica/ui-react/drawer";
import { GradientGlow } from "@appica/ui-react/gradient-glow";
import { Input } from "@appica/ui-react/input";
import { Kbd } from "@appica/ui-react/kbd";
import { Meter } from "@appica/ui-react/meter";
import { MeterProgress } from "@appica/ui-react/meter";
import { Navigation } from "@appica/ui-react/navigation";
import { NavigationItem } from "@appica/ui-react/navigation";
import { NavigationList } from "@appica/ui-react/navigation";
import { NavigationLink } from "@appica/ui-react/navigation";
import { NumberField } from "@appica/ui-react/number-field";
import { Progress } from "@appica/ui-react/progress";
import { Select } from "@appica/ui-react/select";
import { SelectContent } from "@appica/ui-react/select";
import { SelectItem } from "@appica/ui-react/select";
import { SelectTrigger } from "@appica/ui-react/select";
import { SelectValue } from "@appica/ui-react/select";
import { Separator } from "@appica/ui-react/separator";
import { Slider } from "@appica/ui-react/slider";
import { Sparkline } from "@appica/ui-react/sparkline";
import { SparklineChart } from "@appica/ui-react/sparkline";
import { Spinner } from "@appica/ui-react/spinner";
import { Switch } from "@appica/ui-react/switch";
import { Tabs } from "@appica/ui-react/tabs";
import { TabsList } from "@appica/ui-react/tabs";
import { TabsTrigger } from "@appica/ui-react/tabs";
import { TextAnimate } from "@appica/ui-react/text-animate";
import { Thumbnail } from "@appica/ui-react/thumbnail";
import { Toggle } from "@appica/ui-react/toggle";
import { ToggleGroup } from "@appica/ui-react/toggle-group";
import { Toolbar } from "@appica/ui-react/toolbar";
import { ToolbarButton } from "@appica/ui-react/toolbar";
import { ToolbarGroup } from "@appica/ui-react/toolbar";
import { ToolbarInput } from "@appica/ui-react/toolbar";
import { useTheme } from "@appica/ui-react/hooks/use-theme";
import {
  Accessible,
  ActivityHeartbeat,
  ArrowsShuffle,
  ArrowBarToUp,
  ArrowUpRight,
  BrandFigma,
  BrandGithub,
  BrandTypescript,
  BrandX,
  CircleCheckFilled,
  CodeAi,
  Components,
  Copy,
  CreditCard,
  Cpu,
  ExternalLink,
  FileAi,
  FileDescription,
  Heart,
  HeartFilled,
  LayoutDashboard,
  Language,
  Moon,
  MoonStars,
  Menu2,
  Microphone,
  Package,
  Palette,
  Paperclip,
  PlayerPauseFilled,
  PlayerPlayFilled,
  PlayerSkipBackFilled,
  PlayerSkipForwardFilled,
  Repeat,
  Route,
  Rocket,
  Search,
  Send,
  ShoppingCart,
  ShoppingCartPlus,
  Sparkles,
  StarFilled,
  SunHigh,
  TextDirectionRtl,
  TrendingUp,
  Users,
  Wallet,
} from "@appica/icons-react";
import { BrandLogo } from "../BrandLogo";
import { TeamMembersCard } from "../TeamMembersCard";
import { DEFAULT_SITE_NAME } from "../branding";
import { useConsole } from "../console/ConsoleContext";
import { useLocale } from "../console/i18n";
import "./AppicaLandingPage.css";

const APPICA_ORIGIN = "https://appica.dev";
const HEADLINE_ROTATION_INTERVAL_MS = 3200;
const AUDIO_TRACK_DURATION_SECONDS = 222;

const headlinePhrases = [
  "modern web apps",
  "AI-powered apps",
  "e-commerce sites",
  "SaaS dashboards",
  "scalable systems",
];

const modelProviders = [
  { name: "Claude", src: "/assets/img/hero-claude-53b6104287.webp" },
  { name: "Codex", src: "/assets/img/hero-codex-52fd8a0726.webp" },
  { name: "Cursor", src: "/assets/img/hero-cursor-b63f652982.webp" },
  { name: "Grok", src: "/assets/img/hero-grok-8f7563399d.webp" },
  { name: "Hermes", src: "/assets/img/hero-hermes-36f1b32d9d.webp" },
  { name: "OpenCode", src: "/assets/img/hero-opencode-0a4e72d2ce.webp" },
  { name: "Antigravity", src: "/assets/img/hero-antigravity-c8c6175360.webp" },
];

const features = [
  {
    title: "70+ production-ready components",
    description: "From buttons and forms to data tables, dropdown menus, and complex UI patterns - all built to ship.",
    icon: Components,
  },
  {
    title: "Accessible by default",
    description: "Keyboard navigation, focus states, and screen-reader support are built into every component.",
    icon: Accessible,
  },
  {
    title: "Theme it in minutes",
    description: "Customize colors, radius, and typography with CSS variables and Tailwind. Components pick up changes instantly.",
    icon: Palette,
  },
  {
    title: "AI-ready documentation",
    description: "Docs structured for humans and LLMs alike: copy any page as Markdown or point your coding agent at it.",
    icon: FileAi,
  },
  {
    title: "TypeScript-first",
    description: "Strict types, autocomplete, and inline docs mean your editor knows every prop.",
    icon: BrandTypescript,
  },
  {
    title: "Loads only what you use",
    description: "Tree-shakeable imports keep your bundle small. You only ship the components you render.",
    icon: Package,
  },
  {
    title: "Beautiful motion built in",
    description: "Polished microinteractions give every component a tactile, responsive feel. Reduced-motion settings are always respected.",
    icon: ActivityHeartbeat,
  },
  {
    title: "Free Figma library",
    description: "Design and code stay in sync with a free Figma file built on the same variables and components.",
    icon: BrandFigma,
  },
  {
    title: "RTL out of the box",
    description: "Every component mirrors correctly in right-to-left languages, with no extra work for global products.",
    icon: TextDirectionRtl,
  },
];

const componentGroups = [
  {
    value: "actions",
    label: "Actions & Inputs",
    count: 30,
    items: [
      "Autocomplete", "Button", "Button Group", "Calendar", "Checkbox", "Chip", "Color Area", "Color Picker", "Color Slider", "Color Swatch",
      "Color Swatch Picker", "Combobox", "Copy Button", "Date Field", "Date Picker", "Field", "Form", "Input", "Number Field", "OTP Field",
      "Radio", "Rating", "Select", "Slider", "Switch", "Textarea", "Time Field", "Toggle", "Toggle Group", "Toolbar",
    ],
  },
  { value: "display", label: "Data Display & Layout", count: 13, items: ["Avatar", "Badge", "Card", "Carousel", "Table", "Thumbnail", "Tree"] },
  { value: "effects", label: "Decoration & Effects", count: 4, items: ["Background Pattern", "Border Beam", "Gradient Glow", "Text Animate"] },
  { value: "navigation", label: "Menus & Navigation", count: 9, items: ["Breadcrumb", "Command Menu", "Dropdown Menu", "Navigation", "Pagination", "Tabs"] },
  { value: "overlays", label: "Overlays", count: 6, items: ["Dialog", "Drawer", "Popover", "Preview Card", "Tooltip"] },
  { value: "feedback", label: "Status & Feedback", count: 8, items: ["Alert", "Loader", "Progress", "Skeleton", "Spinner", "Toast"] },
];

const searchResults = [
  ["Installation", "/ui/docs/react/installation"],
  ["Set up your coding agent", "/ui/docs/react/agents"],
  ["Usage", "/ui/docs/react/usage"],
  ["Theming", "/ui/docs/react/theming"],
  ["Colors", "/ui/docs/react/colors"],
  ["Fonts", "/ui/docs/react/fonts"],
  ["Dark Mode", "/ui/docs/react/dark-mode"],
  ["Right-to-Left (RTL)", "/ui/docs/react/rtl"],
];

function SourceLink({ href, children, className = "" }) {
  return <a className={`outline-ring rounded-xs ${className}`} href={`${APPICA_ORIGIN}${href}`}>{children}</a>;
}

function SearchDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Search React docs</DialogTitle>
          <DialogDescription>Jump to a guide or component reference.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input autoFocus clearable startSlot={<Search />} placeholder="Search React docs…" aria-label="Search React docs" />
          <div className="flex flex-col gap-1">
            {searchResults.map(([label, href]) => (
              <a key={href} className="text-foreground hover:bg-background-muted outline-ring flex items-center justify-between rounded-md px-3 py-2 text-sm" href={`${APPICA_ORIGIN}${href}`}>
                {label}<ArrowUpRight className="size-4" />
              </a>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function MobileNavigation({ open, onOpenChange }) {
  return (
    <Drawer side="left" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-80">
        <DrawerHeader><DrawerTitle>Appica UI</DrawerTitle></DrawerHeader>
        <DrawerBody className="flex flex-col gap-1 px-4 pb-6">
          {["Docs", "Components", "Icons", "Country Flags"].map((label) => (
            <SourceLink key={label} href={`/ui/${label.toLowerCase().replaceAll(" ", "-")}`} className="text-foreground hover:bg-background-muted flex px-3 py-3 text-base">
              {label}
            </SourceLink>
          ))}
          <a className="text-foreground hover:bg-background-muted outline-ring flex items-center gap-2 rounded-md px-3 py-3 text-base" href="https://www.figma.com/community/file/1657080448204231925">
            Figma <ExternalLink className="size-4" />
          </a>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function LandingHeader({ theme, onThemeChange }) {
  const { authenticated } = useConsole();
  const { locale, setLocale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const nextLocale = locale === "zh" ? "en" : "zh";
  const authLabel = authenticated
    ? (locale === "zh" ? "控制台" : "Console")
    : (locale === "zh" ? "登录" : "Log in");
  const themeLabel = theme === "dark"
    ? (locale === "zh" ? "切换至浅色模式" : "Switch to light mode")
    : (locale === "zh" ? "切换至深色模式" : "Switch to dark mode");
  return (
    <>
      <header className="bg-background/75 sticky top-0 z-30 grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center p-4 backdrop-blur-lg md:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center gap-1.5">
          <Button className="-ms-1 lg:hidden" type="button" variant="ghost" size="icon-md" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu2 /></Button>
          <Link className="outline-ring flex w-fit shrink-0 items-center gap-2 rounded-sm" to="/" aria-label={`${DEFAULT_SITE_NAME} home`}><BrandLogo animated className="size-8" alt="" width="32" height="32" /><span className="text-foreground-intense hidden text-lg font-semibold sm:inline">{DEFAULT_SITE_NAME}</span></Link>
        </div>
        <Navigation className="hidden lg:block" variant="line" aria-label="Primary">
          <NavigationList>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/docs`} />}>Docs</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/components`} />}>Components</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/icons`} />}>Icons</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/country-flags`} />}>Country Flags</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href="https://www.figma.com/community/file/1657080448204231925" />}>Figma <ArrowUpRight /></NavigationLink></NavigationItem>
          </NavigationList>
        </Navigation>
        <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
          <Button className="text-foreground hidden w-45 justify-start lg:inline-flex" variant="soft" onClick={() => setSearchOpen(true)}><Search data-icon="start" /><span className="text-foreground-subtle font-normal">Search</span><span className="ms-auto flex gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span></Button>
          <Button className="lg:hidden" variant="ghost" size="icon-md" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search /></Button>
          <Button variant="ghost" size="sm" aria-label={locale === "zh" ? "Switch to English" : "切换至中文"} onClick={() => setLocale(nextLocale)}><Language className="hidden size-4 sm:block" /><span className="min-w-5">{nextLocale === "zh" ? "中" : "EN"}</span></Button>
          <Button variant="ghost" size="icon-md" aria-label={themeLabel} title={themeLabel} onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <MoonStars /> : <SunHigh />}</Button>
          <Link className={`${buttonVariants({ variant: "primary", size: "sm" })} w-16 max-sm:px-3 sm:w-18`} to={authenticated ? "/admin/dashboard" : "/login"}>{authLabel}</Link>
        </div>
      </header>
      <MobileNavigation open={mobileOpen} onOpenChange={setMobileOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function ShowcaseCard({ className = "", contentClassName = "", children }) {
  return (
    <div className={`relative w-80 shrink-0 p-2 min-[85rem]:min-h-0 min-[85rem]:w-auto min-[85rem]:shrink ${className}`}>
      <span className="bg-background/50 border-background absolute inset-0 h-full w-full rounded-2xl border backdrop-blur-xs" />
      <div className="bg-background border-border-muted relative z-1 h-full rounded-xl border p-6 shadow-lg dark:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.8)]">
        <div className={`${contentClassName} h-full`}>{children}</div>
      </div>
    </div>
  );
}

function ProductCard() {
  const [size, setSize] = useState("42");
  const [favorite, setFavorite] = useState(false);
  return (
    <ShowcaseCard className="order-2 min-[85rem]:h-[45%]" contentClassName="flex flex-col">
      <div className="relative h-34 overflow-hidden rounded-lg">
        <img className="absolute inset-0 size-full object-cover" src="/assets/appica/landing/nimbus-runner.webp" alt="Nimbus Runner sneaker on a pastel background" />
        <Badge className="absolute start-2 top-2" variant="light" size="sm">-20%</Badge>
        <Toggle className={buttonVariants({ variant: "light", size: "icon-sm", className: "absolute! inset-e-2 top-2" })} pressed={favorite} onPressedChange={setFavorite} aria-label="Add to wishlist"><Heart className="in-data-pressed:hidden" /><HeartFilled className="hidden in-data-pressed:block" /></Toggle>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div><h3 className="text-foreground-intense text-sm font-medium">Nimbus Runner</h3><p className="text-foreground-muted text-xs">Men&apos;s running shoes</p></div>
        <div className="text-end"><div className="text-foreground-intense font-semibold tabular-nums">$96</div><s className="text-foreground-muted text-xs tabular-nums">$120</s></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ToggleGroup className="flex gap-1" value={[size]} onValueChange={(value) => value[0] && setSize(value[0])} aria-label="Shoe size">
          {[40, 41, 42, 43].map((value) => <Toggle className={`${buttonVariants({ variant: "outline", size: "icon-sm" })} text-xs ${value === 43 ? "max-sm:hidden" : ""}`} key={value} value={String(value)} aria-label={`Size ${value}`}>{value}</Toggle>)}
        </ToggleGroup>
        <NumberField className="w-24" variant="soft" size="sm" min={1} defaultValue={1} aria-label="Quantity" />
      </div>
      <div className="mt-auto pt-4"><Button className="w-full" variant="primary" size="sm"><ShoppingCartPlus data-icon="start" />Add to cart</Button></div>
    </ShowcaseCard>
  );
}

function CommandCard() {
  return (
    <ShowcaseCard className="order-10 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <Input startSlot={<Search />} endSlot={<Kbd>⌘K</Kbd>} placeholder="Search or jump to…" aria-label="Search commands" />
      <Navigation className="mt-3 flex-1 space-y-3" orientation="vertical" activeLink="dashboard" aria-label="Command results">
        <div>
          <div className="text-foreground-subtle px-2 pb-1.5 text-xs">Suggestions</div>
          <NavigationList>
            <NavigationItem><NavigationLink className="w-full" value="dashboard" render={<button type="button" />}><LayoutDashboard className="text-foreground-subtle" data-icon="start" />Open dashboard<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">G</Kbd><Kbd className="-me-1" size="sm">D</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Users className="text-foreground-subtle" data-icon="start" />Invite teammates<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">I</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><FileDescription className="text-foreground-subtle" data-icon="start" />New document<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">N</Kbd></span></NavigationLink></NavigationItem>
          </NavigationList>
        </div>
        <div>
          <div className="text-foreground-subtle px-2 pb-1.5 text-xs">Actions</div>
          <NavigationList>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Rocket className="text-foreground-subtle" data-icon="start" />Deploy to production<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⇧</Kbd><Kbd className="-me-1" size="sm">D</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Moon className="text-foreground-subtle" data-icon="start" />Toggle dark mode<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">J</Kbd></span></NavigationLink></NavigationItem>
          </NavigationList>
        </div>
      </Navigation>
      <div className="text-foreground-muted mt-3 flex items-center gap-3 text-xs"><span className="flex items-center gap-1"><Kbd size="sm">↑</Kbd><Kbd size="sm">↓</Kbd>navigate</span><span className="flex items-center gap-1"><Kbd size="sm">↵</Kbd>select</span></div>
    </ShowcaseCard>
  );
}

function AudioCard() {
  const [favorite, setFavorite] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(84);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSeconds((elapsed) => Math.min(elapsed + 1, AUDIO_TRACK_DURATION_SECONDS));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (elapsedSeconds >= AUDIO_TRACK_DURATION_SECONDS) setPlaying(false);
  }, [elapsedSeconds]);

  const togglePlayback = (pressed) => {
    if (pressed && elapsedSeconds >= AUDIO_TRACK_DURATION_SECONDS) setElapsedSeconds(0);
    setPlaying(pressed);
  };

  const formatTrackTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  };

  return (
    <ShowcaseCard className="order-5 min-[85rem]:h-[36%]" contentClassName="flex flex-col justify-between gap-4">
      <div className="flex items-center gap-3">
        <img className="size-12 shrink-0 rounded-md object-cover" src="/assets/appica/landing/album-cover.webp" alt="Album cover" />
        <div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">Midnight Drive</div><div className="text-foreground-muted truncate text-xs">Neon Waves - Retrograde</div></div>
        <Toggle className={buttonVariants({ variant: "ghost", size: "icon-sm" })} pressed={favorite} onPressedChange={setFavorite} aria-label="Favorite this track"><Heart className="in-data-pressed:hidden" /><HeartFilled className="hidden in-data-pressed:block" /></Toggle>
      </div>
      <div><Slider value={elapsedSeconds} onValueChange={setElapsedSeconds} max={AUDIO_TRACK_DURATION_SECONDS} tooltipVisibility="never" thumbAriaLabel="Seek" /><div className="text-foreground-muted mt-1.5 flex justify-between text-xs tabular-nums"><span>{formatTrackTime(elapsedSeconds)}</span><span>-{formatTrackTime(AUDIO_TRACK_DURATION_SECONDS - elapsedSeconds)}</span></div></div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label="Shuffle"><ArrowsShuffle /></Button>
        <div className="flex items-center gap-1"><Button className="rounded-full" variant="ghost" size="icon-md" aria-label="Previous track"><PlayerSkipBackFilled /></Button><Toggle className={`${buttonVariants({ variant: "primary", size: "icon-md" })} rounded-full!`} pressed={playing} onPressedChange={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? <PlayerPauseFilled /> : <PlayerPlayFilled />}</Toggle><Button className="rounded-full" variant="ghost" size="icon-md" aria-label="Next track"><PlayerSkipForwardFilled /></Button></div>
        <Button variant="ghost" size="icon-sm" aria-label="Repeat"><Repeat /></Button>
      </div>
    </ShowcaseCard>
  );
}

const deliverySteps = [
  ["Order confirmed", "Jul 3, 9:41 AM"],
  ["Packed & shipped", "Jul 4, 6:12 PM"],
  ["Arrived at sorting hub", "Jul 5, 7:48 AM"],
  ["At local courier facility", "Today, 8:30 AM"],
  ["Out for delivery", "Today, 11:05 AM"],
  ["Delivered", "ETA 2:15 PM"],
];

function OrderCard() {
  return (
    <ShowcaseCard className="order-6 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-start justify-between gap-2"><div><h3 className="text-foreground-intense text-sm font-semibold">Order #10482</h3><p className="text-foreground-muted text-xs">2 items · $148.00</p></div><Badge className="gap-1.25" variant="outline" size="md"><span className="bg-info-emphasis size-2 shrink-0 rounded-full" />In transit</Badge></div>
      <Progress className="mt-4" value={75} aria-label="Delivery progress" />
      <div className="mt-5 flex-1">
        {deliverySteps.map(([label, time], index) => (
          <div className={`relative ps-7 pb-5 last:pb-0 ${index < deliverySteps.length - 1 ? "before:bg-border before:absolute before:inset-s-2 before:top-5.5 before:bottom-0.5 before:w-px" : ""} ${index === 2 ? "max-[84.999rem]:hidden" : ""}`} key={label}>
            {index < 4 ? <CircleCheckFilled className="text-primary absolute inset-s-0 top-0.5 size-4" /> : <span className={`absolute inset-s-0.75 top-1 size-2.5 rounded-full ${index === 4 ? "bg-primary ring-primary/25 ring-3" : "border-border-strong border-2"}`} />}
            <div className="flex items-baseline justify-between gap-2"><span className={`text-sm ${index < 5 ? "text-foreground-intense font-medium" : "text-foreground-muted"}`}>{label}</span><span className="text-foreground-muted text-xs whitespace-nowrap">{time}</span></div>
          </div>
        ))}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center gap-3">
        <Avatar size="sm"><AvatarImage src="/assets/appica/avatars/02.jpg" alt="Marcus" /><AvatarFallback>MC</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">Marcus is on the way</div><div className="text-foreground-muted text-xs">3 stops away</div></div>
        <Button variant="outline" size="icon-sm" aria-label="Track on map"><Route /></Button>
      </div>
    </ShowcaseCard>
  );
}

function RevenueCard() {
  return (
    <ShowcaseCard className="order-1 min-[85rem]:h-[47.5%]" contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground-muted text-sm">Monthly revenue</p>
        <Badge variant="success" size="sm"><TrendingUp data-icon="start" />+12.4%</Badge>
      </div>
      <div className="mt-1 flex items-baseline gap-2"><h3 className="text-foreground-intense text-3xl font-semibold tabular-nums">$48,210</h3><p className="text-foreground-muted text-xs">vs $42,900 last month</p></div>
      <div className="mt-4 flex flex-col gap-2.5">
        <span className="text-foreground-muted text-xs">Top markets</span>
        {[["us", "United States", "$21,690", "45%"], ["de", "Germany", "$9,640", "20%"], ["jp", "Japan", "$7,230", "15%"]].map(([flag, country, amount, share]) => (
          <div className="flex items-center gap-2" key={country}><img className="size-4" src={`/assets/appica/flags/${flag}.svg`} alt="" /><span className="text-foreground text-xs">{country}</span><span className="text-foreground-intense ms-auto text-xs font-medium tabular-nums">{amount}</span><span className="text-foreground-muted w-8 text-end text-xs tabular-nums">{share}</span></div>
        ))}
      </div>
      <Sparkline className="mt-auto pt-3" data={[32, 24, 43, 38, 24, 50, 73, 62, 51, 55, 70, 86]}>
        <SparklineChart height={76} strokeWidth={2} fill aria-label="Revenue over the last 12 months" />
      </Sparkline>
      <Separator className="my-3" />
      <div className="grid grid-cols-2 gap-4"><div><div className="text-foreground-muted text-xs">Orders</div><div className="text-foreground-intense text-sm font-semibold tabular-nums">1,208</div></div><div><div className="text-foreground-muted text-xs">Avg. order value</div><div className="text-foreground-intense text-sm font-semibold tabular-nums">$39.90</div></div></div>
    </ShowcaseCard>
  );
}

const transactions = [
  [Wallet, "Payroll · Appica Inc.", "Income · Jul 1", "+$4,150.00", "income"],
  [Repeat, "Spotify Premium", "Subscription · Jul 2", "-$11.99", "spending"],
  [TrendingUp, "Stripe payout", "Income · Jul 3", "+$860.40", "income"],
  [ShoppingCart, "Whole Foods", "Groceries · Jul 4", "-$74.20", "spending"],
  [Route, "Uber", "Transport · Jul 5", "-$18.40", "spending"],
  [CreditCard, "Card top-up", "Transfer · Jul 5", "-$200.00", "spending"],
];

function TransactionsCard() {
  const [filter, setFilter] = useState("all");
  const visibleTransactions = filter === "all" ? transactions : transactions.filter((transaction) => transaction[4] === filter);
  return (
    <ShowcaseCard className="order-4 min-[85rem]:h-[60%]" contentClassName="flex flex-col">
      <h3 className="text-foreground-intense text-sm font-semibold">Recent transactions</h3>
      <Tabs className="mt-3" value={filter} onValueChange={setFilter} size="sm"><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="income">Income</TabsTrigger><TabsTrigger value="spending">Spending</TabsTrigger></TabsList></Tabs>
      <div className="mt-2 flex flex-1 flex-col">{visibleTransactions.map(([Icon, title, meta, amount]) => <div className={`border-border items-center gap-3 border-t border-dashed py-2.75 first:border-t-0 ${title === "Uber" ? "max-[84.999rem]:pb-0" : ""} ${title === "Card top-up" ? "hidden min-[85rem]:flex" : "flex"}`} key={title}><Thumbnail variant="icon-outline" size="sm"><Icon /></Thumbnail><div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">{title}</div><div className="text-foreground-muted truncate text-xs">{meta}</div></div><span className={`${amount.startsWith("+") ? "text-success-emphasis" : "text-foreground-intense"} text-sm font-medium tabular-nums`}>{amount}</span></div>)}</div>
    </ShowcaseCard>
  );
}

function RatingCard() {
  const ratings = [[5, 78], [4, 14], [3, 5], [2, 2], [1, 1]];
  return (
    <ShowcaseCard className="order-9 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-center gap-3"><span className="text-foreground-intense text-3xl font-semibold tabular-nums">4.8</span><div><div className="text-warning-emphasis flex gap-0.5" aria-label="Rated 4.8 out of 5">{Array.from({ length: 5 }, (_, index) => <StarFilled className="size-3.5" key={index} />)}</div><div className="text-foreground-muted mt-1 text-xs">1,284 verified reviews</div></div></div>
      <div className="mt-4 flex flex-1 flex-col justify-center gap-2">
        {ratings.map(([stars, value]) => <div className="flex items-center gap-2.5" key={stars}><span className="text-foreground-muted w-2 text-xs tabular-nums">{stars}</span><Meter className="flex-1" value={value} aria-label={`${stars} star reviews`}><MeterProgress /></Meter><span className="text-foreground-muted w-8 text-end text-xs tabular-nums">{value}%</span></div>)}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center gap-3"><AvatarGroup>{["02", "04", "09"].map((avatar) => <Avatar size="xs" key={avatar}><AvatarImage src={`/assets/appica/avatars/${avatar}.jpg`} alt="" /><AvatarFallback>AR</AvatarFallback></Avatar>)}</AvatarGroup><span className="text-foreground-muted text-xs">Loved by 12,000+ shoppers</span></div>
    </ShowcaseCard>
  );
}

function AssistantCard() {
  return (
    <ShowcaseCard className="order-3 min-[85rem]:h-[55%]" contentClassName="flex flex-col">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback className="bg-background-inverse text-foreground-inverse">
            <Sparkles className="size-4.5" />
            <AvatarBadge animate />
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground-intense text-sm font-semibold">Appica Assistant</span>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <p className="bg-secondary-soft text-foreground-emphasis max-w-[85%] self-end rounded-lg rounded-br-3xs px-3.5 py-2 text-sm">Build me a pricing page with a monthly / annual toggle.</p>
        <p className="bg-background-muted text-foreground max-w-[85%] self-start rounded-lg rounded-bl-3xs px-3.5 py-2 text-sm">On it - composing Tabs, Switch and Table into a three-tier layout.</p>
        <p className="bg-secondary-soft text-foreground-emphasis max-w-[85%] self-end rounded-md rounded-br-3xs px-3.5 py-2 text-sm">Make the Pro tier featured.</p>
        <span className="text-foreground-muted inline-flex items-center gap-2 px-1 text-xs"><Spinner className="text-[1.4em]" variant="sparkle" currentColor />Generating preview</span>
      </div>
      <div className="mt-3 hidden flex-wrap gap-1.5 min-[85rem]:flex">
        <Chip variant="outline" size="sm">Add a FAQ section</Chip>
        <Chip variant="outline" size="sm">Use dark theme</Chip>
      </div>
      <Toolbar className="mt-3 w-full" aria-label="Message composer">
        <ToolbarInput className="placeholder:text-foreground-subtle h-10 min-w-0 flex-1 ps-3.5 text-sm outline-none" type="text" placeholder="Ask anything…" aria-label="Message the assistant" />
        <ToolbarGroup aria-label="Composer actions">
          <ToolbarButton className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Attach files"><Paperclip /></ToolbarButton>
          <ToolbarButton className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Dictate a message"><Microphone /></ToolbarButton>
          <ToolbarButton className={`${buttonVariants({ variant: "primary", size: "icon-sm" })} me-1`} aria-label="Send message"><Send /></ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
    </ShowcaseCard>
  );
}

function ModelSettingsCard() {
  const models = ["pulse-4", "pulse-4-mini", "atlas-2", "nova-lite"];
  const [model, setModel] = useState("pulse-4");
  const [temperature, setTemperature] = useState(0.7);
  const [contextWindow, setContextWindow] = useState(128);
  return (
    <ShowcaseCard className="order-8 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-2"><h3 className="text-foreground-intense text-sm font-semibold">Model settings</h3><Badge variant="soft" size="sm">Playground</Badge></div>
      <Select items={models} value={model} onValueChange={setModel} alignItemWithTrigger={false}>
        <SelectTrigger className="mt-3" startSlot={<Cpu />} aria-label="Model"><SelectValue>{model}</SelectValue></SelectTrigger>
        <SelectContent>{models.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
      <div className="mt-4">
        <div className="flex items-baseline justify-between"><span className="text-foreground text-sm">Temperature</span><span className="text-foreground-muted text-xs">creative ↔ precise</span></div>
        <Slider className="mt-2" value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.1} thumbAriaLabel="Temperature" />
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between"><span className="text-foreground text-sm">Context window</span><span className="text-foreground-muted text-xs tabular-nums">{contextWindow}k</span></div>
        <Slider className="mt-2" value={contextWindow} onValueChange={setContextWindow} min={8} max={200} step={1} thumbAriaLabel="Context size" />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-4">
        <label className="flex items-center justify-between gap-3 select-none"><span className="text-foreground text-sm">Stream responses</span><Switch size="sm" defaultChecked /></label>
        <label className="flex items-center justify-between gap-3 select-none"><span className="text-foreground text-sm">Allow tool use</span><Switch size="sm" /></label>
      </div>
    </ShowcaseCard>
  );
}

function ShowcaseGallery() {
  return (
    <div className="relative mt-10 sm:mt-12 md:mt-14 lg:mt-16 xl:mt-18 min-[85rem]:mt-20">
      <div className="pointer-events-none absolute inset-x-0 -top-36 -bottom-36 mask-t-from-75% mask-b-from-75%">
        <BackgroundPattern className="absolute inset-0 h-full w-full" variant="dots" spotlight track="window" />
      </div>
      <div className="appica-showcase-grid appica-scroll-row relative flex gap-3 overflow-x-auto px-4 pb-6 md:px-6">
        <div className="appica-showcase-column appica-showcase-column-extra"><AssistantCard /><ModelSettingsCard /></div>
        <div className="appica-showcase-column"><ProductCard /><CommandCard /></div>
        <div className="appica-showcase-column"><AudioCard /><OrderCard /></div>
        <div className="appica-showcase-column"><RevenueCard /><TeamMembersCard className="order-7 min-[85rem]:flex-1" /></div>
        <div className="appica-showcase-column"><TransactionsCard /><RatingCard /></div>
      </div>
    </div>
  );
}

function HeroSection() {
  const { authenticated } = useConsole();
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setPhraseIndex((index) => (index + 1) % headlinePhrases.length), HEADLINE_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <section className="bg-[linear-gradient(to_bottom,var(--background),var(--background-muted)_55%,var(--background-muted)_83%,var(--background))] pt-14 pb-28 sm:pt-18 sm:pb-32 md:pt-22 md:pb-36 lg:pt-26 lg:pb-40 xl:pt-30 xl:pb-44 min-[85rem]:pb-48">
      <div className="appica-landing-container">
        <div className="mx-auto max-w-200 text-center">
          <h1 className="text-foreground-intense text-3xl font-semibold text-nowrap xs:text-4xl sm:text-5xl lg:text-6xl/15">
            Beautiful accessible UI <br className="md:hidden" /> designed by<br className="hidden md:inline" /> <span className="text-nowrap">humans for</span> <br className="md:hidden" />{" "}
            <span className="inline-grid justify-items-center md:justify-items-start">
              {headlinePhrases.map((phrase) => <span className="invisible col-start-1 row-start-1" aria-hidden="true" key={phrase}>{phrase}</span>)}
              <span className="col-start-1 row-start-1"><TextAnimate key={headlinePhrases[phraseIndex]} effect="highlight" by="char">{headlinePhrases[phraseIndex]}</TextAnimate></span>
            </span>
          </h1>
        <p className="text-foreground-muted mx-auto mt-6 max-w-120 text-lg text-pretty">70+ free, polished components for humans and AI agents. <br className="hidden sm:inline" />Ship more. Save time. Burn fewer tokens.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full sm:w-auto`} to={authenticated ? "/admin/dashboard" : "/login"}>Getting Started</Link>
          <GradientGlow className="rounded-lg" revealOn="hover" showOnTouch border>
            <Link className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full sm:w-auto`} to="/login">Browse Components</Link>
          </GradientGlow>
        </div>
        <div className="hero-works hero-supports text-foreground-muted mt-8 flex flex-col items-center gap-3 text-sm">
          <span>Available for</span>
          <div className="hero-agents-strip" aria-label="Supported AI tools">
            {modelProviders.map(({ name, src }) => (
              <img
                className="hero-mark"
                key={name}
                src={src}
                title={name}
                alt={name}
                width="72"
                height="72"
                loading="eager"
                decoding="async"
              />
            ))}
          </div>
        </div>
        </div>
      </div>
      <ShowcaseGallery />
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="appica-landing-container -mt-16">
      <h2 className="text-foreground-intense text-3xl font-semibold md:text-4xl lg:text-5xl">Everything a real product needs</h2>
      <div className="mt-14 hidden grid-cols-3 gap-x-12 gap-y-9 md:grid">{features.map(({ title, description, icon: Icon }) => <article className="flex max-w-83 flex-col items-start" key={title}><Thumbnail className="mb-3.5" variant="icon-outline" size="lg"><Icon /></Thumbnail><h3 className="text-foreground-intense text-xl font-semibold">{title}</h3><p className="text-foreground-muted mt-2.5">{description}</p></article>)}</div>
      <Accordion className="mt-8 md:hidden" variant="alt">{features.map(({ title, description, icon: Icon }) => <AccordionItem key={title} value={title}><AccordionTrigger><Icon className="size-5" />{title}</AccordionTrigger><AccordionContent>{description}</AccordionContent></AccordionItem>)}</Accordion>
    </section>
  );
}

function ComponentPreview() {
  return (
    <a className="outline-ring block w-full max-w-183.75 rounded-2xl" href={`${APPICA_ORIGIN}/ui/components`} aria-label="Browse Appica UI components">
      <img className="h-auto w-full rounded-2xl dark:hidden" src="/assets/appica/landing/component-preview-light.jpg" alt="Preview of Appica UI form, navigation, calendar, and feedback components" />
      <img className="hidden h-auto w-full rounded-2xl dark:block" src="/assets/appica/landing/component-preview-dark.jpg" alt="Preview of Appica UI form, navigation, calendar, and feedback components in dark mode" />
    </a>
  );
}

function ComponentLibrarySection() {
  return (
    <section className="appica-landing-container py-20 sm:py-24 md:py-28 lg:py-32 xl:py-36 min-[85rem]:py-40">
      <div className="grid gap-6 md:grid-cols-12 md:grid-rows-[1fr_auto_auto_1fr] md:gap-x-12 md:gap-y-0">
        <h2 className="text-foreground-intense text-3xl font-semibold md:col-span-5 md:row-start-2 md:text-4xl lg:text-5xl">Explore the component library</h2>
        <div className="flex items-start justify-end md:col-span-7 md:row-span-4 md:row-start-1"><ComponentPreview /></div>
        <div className="md:col-span-5 md:col-start-1 md:row-start-3">
          <Accordion className="md:mt-10" defaultValue={["actions"]} variant="flush" icon="plus" iconVariant="icon-box">
          {componentGroups.map((group) => (
            <AccordionItem key={group.value} value={group.value} variant="flush">
              <AccordionTrigger><span>{group.label} <sup className="text-foreground-muted ms-1 text-xs">{group.count}</sup></span></AccordionTrigger>
              <AccordionContent><div className="flex flex-wrap gap-1.5 pt-1">{group.items.map((item) => <Badge variant="soft" size="lg" render={<a href={`${APPICA_ORIGIN}/ui/components/react/${item.toLowerCase().replaceAll(" & ", "-").replaceAll(" ", "-")}`} />} key={item}>{item}</Badge>)}</div></AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function FooterMedia() {
  return (
    <div className="@container relative mx-auto w-full max-w-173">
      <GradientGlow className="rounded-2xl" blur="3xl" style={{ "--gradient-glow-opacity": 0.2 }}>
        <div className="grid grid-cols-2 items-center gap-7">
          <div className="flex flex-col gap-7">
            <FooterMediaCard src="/assets/appica/landing/footer-1.webp" beamDelay={0} fadeFrom="top" />
            <FooterMediaCard src="/assets/appica/landing/footer-2.webp" beamDelay={-5} fadeFrom="bottom" />
          </div>
          <div className="flex flex-col gap-7">
            <FooterMediaCard src="/assets/appica/landing/footer-3.webp" beamDelay={-1} fadeFrom="top" />
            <FooterMediaCard src="/assets/appica/landing/footer-4.webp" beamDelay={-0.35} fadeFrom="bottom" />
          </div>
        </div>
      </GradientGlow>
    </div>
  );
}

function FooterMediaCard({ src, beamDelay, fadeFrom }) {
  return (
    <div className="relative mx-auto w-full max-w-83 overflow-hidden">
      <BorderBeam
        className="rounded-2xl"
        color="color-mix(in srgb, var(--color-white) 80%, transparent)"
        speed={6}
        delay={beamDelay}
      >
        <div className="border-background/10 bg-background/15 dark:border-foreground-intense/10 dark:bg-foreground-intense/15 rounded-2xl border p-2.25 backdrop-blur-sm">
          <img className="h-auto w-full rounded-lg shadow-[0_30px_40px_-12px_var(--shadow-color)]" src={src} alt="" />
        </div>
      </BorderBeam>
      <div
        className={`pointer-events-none absolute inset-0 to-60% rounded-2xl ${fadeFrom === "top" ? "bg-linear-to-b" : "bg-linear-to-t"} from-background-inverse dark:from-background`}
        aria-hidden="true"
      />
    </div>
  );
}

function LandingFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };
  return (
    <footer className="appica-footer bg-background-inverse text-foreground-inverse dark:bg-background dark:text-foreground overflow-hidden">
      <Separator className="hidden dark:block" variant="gradient" />
      <div className="appica-landing-container">
        <div className="grid items-start gap-8 pt-14 pb-10 sm:pt-16 sm:pb-12 md:grid-cols-12 md:gap-6 md:py-20 lg:py-24 xl:items-center">
          <div className="dark md:col-span-5 md:pe-6">
            <h2 className="text-foreground-intense text-3xl font-semibold md:text-4xl lg:text-5xl">Stay connected. Stay updated.</h2>
            <p className="text-foreground mt-5 md:max-w-105">Subscribe for occasional updates, product insights, and early news from our team - or follow along on X and GitHub.</p>
            <ul className="mt-8 flex flex-col gap-3.5">{[[Copy, "Major library updates"], [CodeAi, "Premium templates"], [Components, "New component releases"]].map(([Icon, label]) => <li className="flex items-center gap-3" key={label}><Thumbnail variant="icon-outline" size="sm"><Icon /></Thumbnail>{label}</li>)}</ul>
            <form className="mt-10 w-full md:max-w-105" aria-label="Newsletter subscription" onSubmit={submit} noValidate>
              <div className="flex items-start gap-2.5"><Input className="flex-1" inputSize="lg" value={email} onChange={(event) => { setEmail(event.target.value); setSubscribed(false); }} placeholder="Your Email" aria-label="Email" type="email" /><Button type="submit" size="icon-lg" aria-label="Subscribe"><ArrowUpRight /></Button></div>
              <div className="mt-3 text-sm"><p className="text-foreground-subtle" role="status">{subscribed ? "Thanks for subscribing." : "No spam. Just updates."}</p></div>
            </form>
            <nav className="mt-8 flex items-center gap-2" aria-label="Social"><a className={buttonVariants({ variant: "soft", size: "icon-md" })} href="https://x.com/Appica_dev" aria-label="X"><BrandX /></a><a className={buttonVariants({ variant: "soft", size: "icon-md" })} href="https://github.com/appica-dev/appica-ui" aria-label="GitHub"><BrandGithub /></a></nav>
          </div>
          <div className="max-md:order-first md:col-span-7"><FooterMedia /></div>
        </div>
        <div className="dark flex items-center justify-between gap-4 pb-6"><p className="text-foreground-subtle text-sm">©2026 Appica UI. A free component library, crafted by the Appica team.</p><Button className="text-foreground-muted" variant="ghost" size="icon-md" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowBarToUp className="size-5" /></Button></div>
      </div>
    </footer>
  );
}

export function AppicaLandingPage() {
  const { mounted, resolvedTheme, setTheme } = useTheme();
  const theme = mounted ? (resolvedTheme || "light") : "light";
  return (
    <div className="appica-landing-root min-h-svh bg-background text-foreground normal-nums antialiased">
      <LandingHeader theme={theme} onThemeChange={setTheme} />
      <main>
        <HeroSection />
        <div className="relative z-1"><FeatureSection /><ComponentLibrarySection /></div>
      </main>
      <LandingFooter />
    </div>
  );
}
