import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Accordion } from "@appica/ui-react/accordion";
import { AccordionContent } from "@appica/ui-react/accordion";
import { AccordionItem } from "@appica/ui-react/accordion";
import { AccordionTrigger } from "@appica/ui-react/accordion";
import { Avatar } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { AvatarGroup } from "@appica/ui-react/avatar";
import { AvatarImage } from "@appica/ui-react/avatar";
import { BackgroundPattern } from "@appica/ui-react/background-pattern";
import { Badge } from "@appica/ui-react/badge";
import { BorderBeam } from "@appica/ui-react/border-beam";
import { Button } from "@appica/ui-react/button";
import { buttonVariants } from "@appica/ui-react/button";
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
import { Switch } from "@appica/ui-react/switch";
import { Tabs } from "@appica/ui-react/tabs";
import { TabsList } from "@appica/ui-react/tabs";
import { TabsTrigger } from "@appica/ui-react/tabs";
import { TextAnimate } from "@appica/ui-react/text-animate";
import { Thumbnail } from "@appica/ui-react/thumbnail";
import { Toggle } from "@appica/ui-react/toggle";
import { ToggleGroup } from "@appica/ui-react/toggle-group";
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
  Package,
  Palette,
  PlayerPauseFilled,
  PlayerPlayFilled,
  PlayerSkipBackFilled,
  PlayerSkipForwardFilled,
  Repeat,
  Route,
  Rocket,
  Search,
  ShoppingCart,
  ShoppingCartPlus,
  StarFilled,
  SunHigh,
  TextDirectionRtl,
  TrendingUp,
  Users,
  Wallet,
} from "@appica/icons-react";
import { AppicaAssistantCard } from "../AppicaAssistant";
import { BrandLogo } from "../BrandLogo";
import { TeamMembersCard } from "../TeamMembersCard";
import { DEFAULT_SITE_NAME } from "../branding";
import { useConsole } from "../console/ConsoleContext";
import { useLocale } from "../console/i18n";
import "./AppicaLandingPage.css";

const APPICA_ORIGIN = "https://appica.dev";
const HEADLINE_ROTATION_INTERVAL_MS = 3200;
const AUDIO_TRACK_DURATION_SECONDS = 222;

const headlinePhraseKeys = [
  "landing.hero.phrase.text",
  "landing.hero.phrase.code",
  "landing.hero.phrase.image",
  "landing.hero.phrase.video",
  "landing.hero.phrase.agent",
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
    title: "landing.feature.1.title",
    description: "landing.feature.1.body",
    icon: Components,
  },
  {
    title: "landing.feature.2.title",
    description: "landing.feature.2.body",
    icon: Accessible,
  },
  {
    title: "landing.feature.3.title",
    description: "landing.feature.3.body",
    icon: Palette,
  },
  {
    title: "landing.feature.4.title",
    description: "landing.feature.4.body",
    icon: FileAi,
  },
  {
    title: "landing.feature.5.title",
    description: "landing.feature.5.body",
    icon: BrandTypescript,
  },
  {
    title: "landing.feature.6.title",
    description: "landing.feature.6.body",
    icon: Package,
  },
  {
    title: "landing.feature.7.title",
    description: "landing.feature.7.body",
    icon: ActivityHeartbeat,
  },
  {
    title: "landing.feature.8.title",
    description: "landing.feature.8.body",
    icon: BrandFigma,
  },
  {
    title: "landing.feature.9.title",
    description: "landing.feature.9.body",
    icon: TextDirectionRtl,
  },
];

const componentGroups = [
  {
    value: "actions",
    label: "landing.group.actions",
    count: 30,
    items: [
      "Autocomplete", "Button", "Button Group", "Calendar", "Checkbox", "Chip", "Color Area", "Color Picker", "Color Slider", "Color Swatch",
      "Color Swatch Picker", "Combobox", "Copy Button", "Date Field", "Date Picker", "Field", "Form", "Input", "Number Field", "OTP Field",
      "Radio", "Rating", "Select", "Slider", "Switch", "Textarea", "Time Field", "Toggle", "Toggle Group", "Toolbar",
    ],
  },
  { value: "display", label: "landing.group.display", count: 13, items: ["Avatar", "Badge", "Card", "Carousel", "Table", "Thumbnail", "Tree"] },
  { value: "effects", label: "landing.group.effects", count: 4, items: ["Background Pattern", "Border Beam", "Gradient Glow", "Text Animate"] },
  { value: "navigation", label: "landing.group.navigation", count: 9, items: ["Breadcrumb", "Command Menu", "Dropdown Menu", "Navigation", "Pagination", "Tabs"] },
  { value: "overlays", label: "landing.group.overlays", count: 6, items: ["Dialog", "Drawer", "Popover", "Preview Card", "Tooltip"] },
  { value: "feedback", label: "landing.group.feedback", count: 8, items: ["Alert", "Loader", "Progress", "Skeleton", "Spinner", "Toast"] },
];

const searchResults = [
  ["landing.searchResult.installation", "/ui/docs/react/installation"],
  ["landing.searchResult.agents", "/ui/docs/react/agents"],
  ["landing.searchResult.usage", "/ui/docs/react/usage"],
  ["landing.searchResult.theming", "/ui/docs/react/theming"],
  ["landing.searchResult.colors", "/ui/docs/react/colors"],
  ["landing.searchResult.fonts", "/ui/docs/react/fonts"],
  ["landing.searchResult.dark", "/ui/docs/react/dark-mode"],
  ["landing.searchResult.rtl", "/ui/docs/react/rtl"],
];

function SourceLink({ href, children, className = "" }) {
  return <a className={`outline-ring rounded-xs ${className}`} href={`${APPICA_ORIGIN}${href}`}>{children}</a>;
}

function SearchDialog({ open, onOpenChange }) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("landing.searchTitle")}</DialogTitle>
          <DialogDescription>{t("landing.searchDescription")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input autoFocus clearable startSlot={<Search />} placeholder={t("landing.searchPlaceholder")} aria-label={t("landing.searchPlaceholder")} />
          <div className="flex flex-col gap-1">
            {searchResults.map(([labelKey, href]) => (
              <a key={href} className="text-foreground hover:bg-background-muted outline-ring flex items-center justify-between rounded-md px-3 py-2 text-sm" href={`${APPICA_ORIGIN}${href}`}>
                {t(labelKey)}<ArrowUpRight className="size-4" />
              </a>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function MobileNavigation({ open, onOpenChange }) {
  const { t } = useLocale();
  const items = [
    ["landing.nav.docs", "/ui/docs"],
    ["landing.nav.components", "/ui/components"],
    ["landing.nav.icons", "/ui/icons"],
    ["landing.nav.flags", "/ui/country-flags"],
  ];
  return (
    <Drawer side="left" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-80">
        <DrawerHeader><DrawerTitle>{t("landing.drawerTitle")}</DrawerTitle></DrawerHeader>
        <DrawerBody className="flex flex-col gap-1 px-4 pb-6">
          {items.map(([labelKey, href]) => (
            <SourceLink key={href} href={href} className="text-foreground hover:bg-background-muted flex px-3 py-3 text-base">
              {t(labelKey)}
            </SourceLink>
          ))}
          <a className="text-foreground hover:bg-background-muted outline-ring flex items-center gap-2 rounded-md px-3 py-3 text-base" href="https://www.figma.com/community/file/1657080448204231925">
            {t("landing.nav.figma")} <ExternalLink className="size-4" />
          </a>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function LandingHeader({ theme, onThemeChange }) {
  const { authenticated } = useConsole();
  const { locale, setLocale, t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const nextLocale = locale === "zh" ? "en" : "zh";
  const authLabel = authenticated ? t("nav.dashboard") : t("auth.login.submit");
  const themeLabel = theme === "dark"
    ? (locale === "zh" ? "切换至浅色模式" : "Switch to light mode")
    : (locale === "zh" ? "切换至深色模式" : "Switch to dark mode");
  return (
    <>
      <header className="bg-background/75 sticky top-0 z-30 grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center p-4 backdrop-blur-lg md:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center gap-1.5">
          <Button className="-ms-1 lg:hidden" type="button" variant="ghost" size="icon-md" aria-label={t("landing.nav.open")} onClick={() => setMobileOpen(true)}><Menu2 /></Button>
          <Link className="outline-ring flex w-fit shrink-0 items-center gap-2 rounded-sm" to="/" aria-label={t("landing.nav.home")}><BrandLogo animated className="size-8" alt="" width="32" height="32" /><span className="text-foreground-intense hidden text-lg font-semibold sm:inline">{DEFAULT_SITE_NAME}</span></Link>
        </div>
        <Navigation className="hidden lg:block" variant="line" aria-label={t("landing.nav.primary")}>
          <NavigationList>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/docs`} />}>{t("landing.nav.docs")}</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/components`} />}>{t("landing.nav.components")}</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/icons`} />}>{t("landing.nav.icons")}</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href={`${APPICA_ORIGIN}/ui/country-flags`} />}>{t("landing.nav.flags")}</NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink render={<a href="https://www.figma.com/community/file/1657080448204231925" />}>{t("landing.nav.figma")} <ArrowUpRight /></NavigationLink></NavigationItem>
          </NavigationList>
        </Navigation>
        <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
          <Button className="text-foreground hidden w-45 justify-start lg:inline-flex" variant="soft" onClick={() => setSearchOpen(true)}><Search data-icon="start" /><span className="text-foreground-subtle font-normal">{t("landing.search")}</span><span className="ms-auto flex gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span></Button>
          <Button className="lg:hidden" variant="ghost" size="icon-md" aria-label={t("landing.search")} onClick={() => setSearchOpen(true)}><Search /></Button>
          <Button variant="ghost" size="sm" aria-label={t("nav.switchLanguage")} onClick={() => setLocale(nextLocale)}><Language className="hidden size-4 sm:block" /><span className="min-w-5">{nextLocale === "zh" ? "中" : "EN"}</span></Button>
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
  const { t } = useLocale();
  const [size, setSize] = useState("2");
  const [favorite, setFavorite] = useState(false);
  return (
    <ShowcaseCard className="order-2 min-[85rem]:h-[45%]" contentClassName="flex flex-col">
      <div className="relative h-34 overflow-hidden rounded-lg">
        <img className="absolute inset-0 size-full object-cover" src="/assets/appica/landing/nimbus-runner.webp" alt={t("landing.product.imageAlt")} />
        <Badge className="absolute start-2 top-2" variant="light" size="sm">{t("landing.product.badge")}</Badge>
        <Toggle className={buttonVariants({ variant: "light", size: "icon-sm", className: "absolute! inset-e-2 top-2" })} pressed={favorite} onPressedChange={setFavorite} aria-label={t("landing.audio.favorite")}><Heart className="in-data-pressed:hidden" /><HeartFilled className="hidden in-data-pressed:block" /></Toggle>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div><h3 className="text-foreground-intense text-sm font-medium">{t("landing.product.title")}</h3><p className="text-foreground-muted text-xs">{t("landing.product.subtitle")}</p></div>
        <div className="text-end"><div className="text-foreground-intense font-semibold tabular-nums">{t("landing.product.price")}</div><s className="text-foreground-muted text-xs tabular-nums">{t("landing.product.previousPrice")}</s></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ToggleGroup className="flex gap-1" value={[size]} onValueChange={(value) => value[0] && setSize(value[0])} aria-label={t("landing.product.modeAria")}>
          {[1, 2, 3, 4].map((value) => <Toggle className={`${buttonVariants({ variant: "outline", size: "icon-sm" })} text-xs ${value === 4 ? "max-sm:hidden" : ""}`} key={value} value={String(value)} aria-label={t("landing.product.priorityAria", { value })}>{value}</Toggle>)}
        </ToggleGroup>
        <NumberField className="w-24" variant="soft" size="sm" min={1} defaultValue={1} aria-label={t("landing.product.retriesAria")} />
      </div>
      <div className="mt-auto pt-4"><Button className="w-full" variant="primary" size="sm"><ShoppingCartPlus data-icon="start" />{t("landing.product.send")}</Button></div>
    </ShowcaseCard>
  );
}

function CommandCard() {
  const { t } = useLocale();
  return (
    <ShowcaseCard className="order-10 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <Input startSlot={<Search />} endSlot={<Kbd>⌘K</Kbd>} placeholder={t("landing.command.placeholder")} aria-label={t("landing.command.aria")} />
      <Navigation className="mt-3 flex-1 space-y-3" orientation="vertical" activeLink="dashboard" aria-label={t("landing.command.aria")}>
        <div>
          <div className="text-foreground-subtle px-2 pb-1.5 text-xs">{t("landing.command.suggestions")}</div>
          <NavigationList>
            <NavigationItem><NavigationLink className="w-full" value="dashboard" render={<button type="button" />}><LayoutDashboard className="text-foreground-subtle" data-icon="start" />{t("landing.command.openOverview")}<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">G</Kbd><Kbd className="-me-1" size="sm">D</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Users className="text-foreground-subtle" data-icon="start" />{t("landing.command.createKey")}<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">I</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><FileDescription className="text-foreground-subtle" data-icon="start" />{t("landing.command.viewUsage")}<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">N</Kbd></span></NavigationLink></NavigationItem>
          </NavigationList>
        </div>
        <div>
          <div className="text-foreground-subtle px-2 pb-1.5 text-xs">{t("landing.command.actions")}</div>
          <NavigationList>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Rocket className="text-foreground-subtle" data-icon="start" />{t("landing.command.viewHealth")}<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⇧</Kbd><Kbd className="-me-1" size="sm">D</Kbd></span></NavigationLink></NavigationItem>
            <NavigationItem><NavigationLink className="w-full" render={<button type="button" />}><Moon className="text-foreground-subtle" data-icon="start" />{t("landing.command.openImage")}<span className="ms-auto flex gap-1"><Kbd className="-me-1" size="sm">⌘</Kbd><Kbd className="-me-1" size="sm">J</Kbd></span></NavigationLink></NavigationItem>
          </NavigationList>
        </div>
      </Navigation>
      <div className="text-foreground-muted mt-3 flex items-center gap-3 text-xs"><span className="flex items-center gap-1"><Kbd size="sm">↑</Kbd><Kbd size="sm">↓</Kbd>{t("landing.command.navigate")}</span><span className="flex items-center gap-1"><Kbd size="sm">↵</Kbd>{t("landing.command.select")}</span></div>
    </ShowcaseCard>
  );
}

function AudioCard() {
  const { t } = useLocale();
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
        <img className="size-12 shrink-0 rounded-md object-cover" src="/assets/appica/landing/album-cover.webp" alt={t("landing.audio.imageAlt")} />
        <div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">{t("landing.audio.title")}</div><div className="text-foreground-muted truncate text-xs">{t("landing.audio.subtitle")}</div></div>
        <Toggle className={buttonVariants({ variant: "ghost", size: "icon-sm" })} pressed={favorite} onPressedChange={setFavorite} aria-label={t("landing.audio.favorite")}><Heart className="in-data-pressed:hidden" /><HeartFilled className="hidden in-data-pressed:block" /></Toggle>
      </div>
      <div><Slider value={elapsedSeconds} onValueChange={setElapsedSeconds} max={AUDIO_TRACK_DURATION_SECONDS} tooltipVisibility="never" thumbAriaLabel={t("landing.audio.seek")} /><div className="text-foreground-muted mt-1.5 flex justify-between text-xs tabular-nums"><span>{formatTrackTime(elapsedSeconds)}</span><span>-{formatTrackTime(AUDIO_TRACK_DURATION_SECONDS - elapsedSeconds)}</span></div></div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label={t("landing.audio.shuffle")}><ArrowsShuffle /></Button>
        <div className="flex items-center gap-1"><Button className="rounded-full" variant="ghost" size="icon-md" aria-label={t("landing.audio.previous")}><PlayerSkipBackFilled /></Button><Toggle className={`${buttonVariants({ variant: "primary", size: "icon-md" })} rounded-full!`} pressed={playing} onPressedChange={togglePlayback} aria-label={playing ? t("landing.audio.pause") : t("landing.audio.replay")}>{playing ? <PlayerPauseFilled /> : <PlayerPlayFilled />}</Toggle><Button className="rounded-full" variant="ghost" size="icon-md" aria-label={t("landing.audio.next")}><PlayerSkipForwardFilled /></Button></div>
        <Button variant="ghost" size="icon-sm" aria-label={t("landing.audio.repeat")}><Repeat /></Button>
      </div>
    </ShowcaseCard>
  );
}

const deliverySteps = [
  ["landing.order.step.received", "09:41"],
  ["landing.order.step.authenticated", "09:42"],
  ["landing.order.step.routed", "09:42"],
  ["landing.order.step.responded", "09:43"],
  ["landing.order.step.recorded", "09:43"],
];

function OrderCard() {
  const { t } = useLocale();
  return (
    <ShowcaseCard className="order-6 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-start justify-between gap-2"><div><h3 className="text-foreground-intense text-sm font-semibold">{t("landing.order.title")}</h3><p className="text-foreground-muted text-xs">{t("landing.order.subtitle")}</p></div><Badge className="gap-1.25" variant="outline" size="md"><span className="bg-info-emphasis size-2 shrink-0 rounded-full" />{t("landing.order.status")}</Badge></div>
      <Progress className="mt-4" value={75} aria-label={t("landing.order.progress")} />
      <div className="mt-5 flex-1">
        {deliverySteps.map(([labelKey, time], index) => (
          <div className={`relative ps-7 pb-5 last:pb-0 ${index < deliverySteps.length - 1 ? "before:bg-border before:absolute before:inset-s-2 before:top-5.5 before:bottom-0.5 before:w-px" : ""} ${index === 2 ? "max-[84.999rem]:hidden" : ""}`} key={labelKey}>
            {index < 4 ? <CircleCheckFilled className="text-primary absolute inset-s-0 top-0.5 size-4" /> : <span className={`absolute inset-s-0.75 top-1 size-2.5 rounded-full ${index === 4 ? "bg-primary ring-primary/25 ring-3" : "border-border-strong border-2"}`} />}
            <div className="flex items-baseline justify-between gap-2"><span className={`text-sm ${index < 5 ? "text-foreground-intense font-medium" : "text-foreground-muted"}`}>{t(labelKey)}</span><span className="text-foreground-muted text-xs whitespace-nowrap">{time}</span></div>
          </div>
        ))}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center gap-3">
        <Avatar size="sm"><AvatarImage src="/assets/appica/avatars/02.jpg" alt="WayX route" /><AvatarFallback>WX</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">{t("landing.order.primaryRoute")}</div><div className="text-foreground-muted text-xs">{t("landing.order.latency")}</div></div>
        <Button variant="outline" size="icon-sm" aria-label={t("landing.order.route")}><Route /></Button>
      </div>
    </ShowcaseCard>
  );
}

function RevenueCard() {
  const { t } = useLocale();
  return (
    <ShowcaseCard className="order-1 min-[85rem]:h-[47.5%]" contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground-muted text-sm">{t("landing.usage.title")}</p>
        <Badge variant="success" size="sm"><TrendingUp data-icon="start" />{t("landing.usage.change")}</Badge>
      </div>
      <div className="mt-1 flex items-baseline gap-2"><h3 className="text-foreground-intense text-3xl font-semibold tabular-nums">48.2M</h3><p className="text-foreground-muted text-xs">{t("landing.usage.vsLast")}</p></div>
      <div className="mt-4 flex flex-col gap-2.5">
        <span className="text-foreground-muted text-xs">{t("landing.usage.topModels")}</span>
        {[["us", t("landing.usage.model.1"), "21.7M", "45%"], ["de", t("landing.usage.model.2"), "9.6M", "20%"], ["jp", t("landing.usage.model.3"), "7.2M", "15%"]].map(([flag, model, amount, share]) => (
          <div className="flex items-center gap-2" key={model}><img className="size-4" src={`/assets/appica/flags/${flag}.svg`} alt="" /><span className="text-foreground text-xs">{model}</span><span className="text-foreground-intense ms-auto text-xs font-medium tabular-nums">{amount}</span><span className="text-foreground-muted w-8 text-end text-xs tabular-nums">{share}</span></div>
        ))}
      </div>
      <Sparkline className="mt-auto pt-3" data={[32, 24, 43, 38, 24, 50, 73, 62, 51, 55, 70, 86]}>
        <SparklineChart height={76} strokeWidth={2} fill aria-label={t("landing.usage.title")} />
      </Sparkline>
      <Separator className="my-3" />
      <div className="grid grid-cols-2 gap-4"><div><div className="text-foreground-muted text-xs">{t("landing.usage.requests")}</div><div className="text-foreground-intense text-sm font-semibold tabular-nums">1,208</div></div><div><div className="text-foreground-muted text-xs">{t("landing.usage.avgCost")}</div><div className="text-foreground-intense text-sm font-semibold tabular-nums">$0.04</div></div></div>
    </ShowcaseCard>
  );
}

const transactions = [
  [Wallet, "landing.activity.chat", "landing.activity.time.1", "landing.activity.amount.1", "success"],
  [Repeat, "landing.activity.image", "landing.activity.time.2", "landing.activity.amount.2", "success"],
  [TrendingUp, "landing.activity.video", "landing.activity.time.3", "landing.activity.amount.3", "success"],
  [ShoppingCart, "landing.activity.key", "landing.activity.time.4", "landing.activity.amount.4", "errors"],
  [Route, "landing.activity.route", "landing.activity.time.5", "landing.activity.amount.5", "success"],
  [CreditCard, "landing.activity.route", "landing.activity.time.6", "landing.activity.amount.6", "errors"],
];

function TransactionsCard() {
  const { t } = useLocale();
  const [filter, setFilter] = useState("all");
  const visibleTransactions = filter === "all" ? transactions : transactions.filter((transaction) => transaction[4] === filter);
  return (
    <ShowcaseCard className="order-4 min-[85rem]:h-[60%]" contentClassName="flex flex-col">
      <h3 className="text-foreground-intense text-sm font-semibold">{t("landing.activity.title")}</h3>
      <Tabs className="mt-3" value={filter} onValueChange={setFilter} size="sm"><TabsList><TabsTrigger value="all">{t("landing.activity.all")}</TabsTrigger><TabsTrigger value="success">{t("landing.activity.success")}</TabsTrigger><TabsTrigger value="errors">{t("landing.activity.errors")}</TabsTrigger></TabsList></Tabs>
      <div className="mt-2 flex flex-1 flex-col">{visibleTransactions.map(([Icon, titleKey, metaKey, amountKey]) => <div className={`border-border items-center gap-3 border-t border-dashed py-2.75 first:border-t-0 ${metaKey === "landing.activity.time.5" ? "max-[84.999rem]:pb-0" : ""} ${metaKey === "landing.activity.time.6" ? "hidden min-[85rem]:flex" : "flex"}`} key={`${titleKey}-${metaKey}`}><Thumbnail variant="icon-outline" size="sm"><Icon /></Thumbnail><div className="min-w-0 flex-1"><div className="text-foreground-intense truncate text-sm font-medium">{t(titleKey)}</div><div className="text-foreground-muted truncate text-xs">{t(metaKey)}</div></div><span className={`${t(amountKey).startsWith("+") ? "text-success-emphasis" : "text-foreground-intense"} text-sm font-medium tabular-nums`}>{t(amountKey)}</span></div>)}</div>
    </ShowcaseCard>
  );
}

function RatingCard() {
  const { t } = useLocale();
  const ratings = [[5, 78], [4, 14], [3, 5], [2, 2], [1, 1]];
  return (
    <ShowcaseCard className="order-9 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-center gap-3"><span className="text-foreground-intense text-3xl font-semibold tabular-nums">{t("landing.health.score")}</span><div><div className="text-warning-emphasis flex gap-0.5" aria-label={t("landing.health.score")}>{Array.from({ length: 5 }, (_, index) => <StarFilled className="size-3.5" key={index} />)}</div><div className="text-foreground-muted mt-1 text-xs">{t("landing.health.detail")}</div></div></div>
      <div className="mt-4 flex flex-1 flex-col justify-center gap-2">
        {ratings.map(([stars, value]) => <div className="flex items-center gap-2.5" key={stars}><span className="text-foreground-muted w-2 text-xs tabular-nums">{stars}</span><Meter className="flex-1" value={value} aria-label={`${stars} ${t("landing.health.detail")}`}><MeterProgress /></Meter><span className="text-foreground-muted w-8 text-end text-xs tabular-nums">{value}%</span></div>)}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center gap-3"><AvatarGroup>{["02", "04", "09"].map((avatar) => <Avatar size="xs" key={avatar}><AvatarImage src={`/assets/appica/avatars/${avatar}.jpg`} alt="" /><AvatarFallback>WX</AvatarFallback></Avatar>)}</AvatarGroup><span className="text-foreground-muted text-xs">{t("landing.health.routes")}</span></div>
    </ShowcaseCard>
  );
}

function AssistantCard() {
  return <AppicaAssistantCard className="order-3 w-80 shrink-0 min-[85rem]:h-[55%] min-[85rem]:min-h-0 min-[85rem]:w-auto min-[85rem]:shrink" />;
}

function ModelSettingsCard() {
  const { t } = useLocale();
  const models = ["gpt-4.1", "claude-sonnet", "gemini-2.5", "flux.1"];
  const [model, setModel] = useState("gpt-4.1");
  const [temperature, setTemperature] = useState(0.7);
  const [contextWindow, setContextWindow] = useState(128);
  return (
    <ShowcaseCard className="order-8 min-[85rem]:flex-1" contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-2"><h3 className="text-foreground-intense text-sm font-semibold">{t("landing.routing.title")}</h3><Badge variant="soft" size="sm">{t("landing.routing.badge")}</Badge></div>
      <Select items={models} value={model} onValueChange={setModel} alignItemWithTrigger={false}>
        <SelectTrigger className="mt-3" startSlot={<Cpu />} aria-label={t("landing.routing.modelAria")}><SelectValue>{model}</SelectValue></SelectTrigger>
        <SelectContent>{models.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
      <div className="mt-4">
        <div className="flex items-baseline justify-between"><span className="text-foreground text-sm">{t("landing.routing.temperature")}</span><span className="text-foreground-muted text-xs">{t("landing.routing.temperatureHint")}</span></div>
        <Slider className="mt-2" value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.1} thumbAriaLabel={t("landing.routing.temperature")} />
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between"><span className="text-foreground text-sm">{t("landing.routing.context")}</span><span className="text-foreground-muted text-xs tabular-nums">{contextWindow}k</span></div>
        <Slider className="mt-2" value={contextWindow} onValueChange={setContextWindow} min={8} max={200} step={1} thumbAriaLabel={t("landing.routing.context")} />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-4">
        <label className="flex items-center justify-between gap-3 select-none"><span className="text-foreground text-sm">{t("landing.routing.stream")}</span><Switch size="sm" defaultChecked /></label>
        <label className="flex items-center justify-between gap-3 select-none"><span className="text-foreground text-sm">{t("landing.routing.tools")}</span><Switch size="sm" /></label>
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
  const { t } = useLocale();
  const headlinePhrases = headlinePhraseKeys.map((key) => t(key));
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setPhraseIndex((index) => (index + 1) % headlinePhrases.length), HEADLINE_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [headlinePhrases.length]);
  return (
    <section className="bg-[linear-gradient(to_bottom,var(--background),var(--background-muted)_55%,var(--background-muted)_83%,var(--background))] pt-14 pb-28 sm:pt-18 sm:pb-32 md:pt-22 md:pb-36 lg:pt-26 lg:pb-40 xl:pt-30 xl:pb-44 min-[85rem]:pb-48">
      <div className="appica-landing-container">
        <div className="mx-auto max-w-200 text-center">
          <h1 className="text-foreground-intense text-3xl font-semibold text-nowrap xs:text-4xl sm:text-5xl lg:text-6xl/15">
            {t("landing.hero.titleLead")} <br className="md:hidden" /> {t("landing.hero.titleBridge")}<br className="hidden md:inline" /> <span className="text-nowrap" aria-hidden="true" /> <br className="md:hidden" />{" "}
            <span className="inline-grid justify-items-center md:justify-items-start">
              {headlinePhrases.map((phrase) => <span className="invisible col-start-1 row-start-1" aria-hidden="true" key={phrase}>{phrase}</span>)}
              <span className="col-start-1 row-start-1"><TextAnimate key={headlinePhrases[phraseIndex]} effect="highlight" by="char">{headlinePhrases[phraseIndex]}</TextAnimate></span>
            </span>
          </h1>
        <p className="text-foreground-muted mx-auto mt-6 max-w-120 text-lg text-pretty">{t("landing.hero.subtitle")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full sm:w-auto`} to={authenticated ? "/admin/dashboard" : "/login"}>{authenticated ? t("landing.hero.console") : t("landing.hero.start")}</Link>
          <GradientGlow className="rounded-lg" revealOn="hover" showOnTouch border>
            <Link className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full sm:w-auto`} to="/login">{t("landing.hero.integration")}</Link>
          </GradientGlow>
        </div>
        <div className="text-foreground-muted mt-8 flex flex-col items-center gap-3 text-sm">
          <span>{t("landing.hero.meta")}</span>
          <span>{t("landing.hero.support")}</span>
          <div className="inline-flex flex-wrap items-center justify-center" aria-label={t("landing.hero.supportAria")}>
            {modelProviders.map(({ name, src }) => (
              <img
                className="relative -ml-3 size-12 first:ml-0 sm:-ml-4 sm:size-15 motion-safe:transition-transform motion-safe:hover:z-1 motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-110"
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
  const { t } = useLocale();
  return (
    <section className="appica-landing-container -mt-16">
      <h2 className="text-foreground-intense text-3xl font-semibold md:text-4xl lg:text-5xl">{t("landing.feature.heading")}</h2>
      <div className="mt-14 hidden grid-cols-3 gap-x-12 gap-y-9 md:grid">{features.map(({ title, description, icon: Icon }) => <article className="flex max-w-83 flex-col items-start" key={title}><Thumbnail className="mb-3.5" variant="icon-outline" size="lg"><Icon /></Thumbnail><h3 className="text-foreground-intense text-xl font-semibold">{t(title)}</h3><p className="text-foreground-muted mt-2.5">{t(description)}</p></article>)}</div>
      <Accordion className="mt-8 md:hidden" variant="alt">{features.map(({ title, description, icon: Icon }) => <AccordionItem key={title} value={title}><AccordionTrigger><Icon className="size-5" />{t(title)}</AccordionTrigger><AccordionContent>{t(description)}</AccordionContent></AccordionItem>)}</Accordion>
    </section>
  );
}

function ComponentPreview() {
  const { t } = useLocale();
  return (
    <a className="outline-ring block w-full max-w-183.75 rounded-2xl" href={`${APPICA_ORIGIN}/ui/components`} aria-label={t("landing.library.aria")}>
      <img className="h-auto w-full rounded-2xl dark:hidden" src="/assets/appica/landing/component-preview-light.jpg" alt={t("landing.library.aria")} />
      <img className="hidden h-auto w-full rounded-2xl dark:block" src="/assets/appica/landing/component-preview-dark.jpg" alt={t("landing.library.aria")} />
    </a>
  );
}

function ComponentLibrarySection() {
  const { t } = useLocale();
  return (
    <section className="appica-landing-container py-20 sm:py-24 md:py-28 lg:py-32 xl:py-36 min-[85rem]:py-40">
      <div className="grid gap-6 md:grid-cols-12 md:grid-rows-[1fr_auto_auto_1fr] md:gap-x-12 md:gap-y-0">
        <h2 className="text-foreground-intense text-3xl font-semibold md:col-span-5 md:row-start-2 md:text-4xl lg:text-5xl">{t("landing.library.heading")}</h2>
        <div className="flex items-start justify-end md:col-span-7 md:row-span-4 md:row-start-1"><ComponentPreview /></div>
        <div className="md:col-span-5 md:col-start-1 md:row-start-3">
          <Accordion className="md:mt-10" defaultValue={["actions"]} variant="flush" icon="plus" iconVariant="icon-box">
          {componentGroups.map((group) => (
            <AccordionItem key={group.value} value={group.value} variant="flush">
              <AccordionTrigger><span>{t(group.label)} <sup className="text-foreground-muted ms-1 text-xs">{group.count}</sup></span></AccordionTrigger>
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
  const { t } = useLocale();
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
            <h2 className="text-foreground-intense text-3xl font-semibold md:text-4xl lg:text-5xl">{t("landing.footer.title")}</h2>
            <p className="text-foreground mt-5 md:max-w-105">{t("landing.footer.description")}</p>
            <ul className="mt-8 flex flex-col gap-3.5">{[[Copy, "landing.footer.updateModels"], [CodeAi, "landing.footer.integration"], [Components, "landing.footer.workspace"]].map(([Icon, labelKey]) => <li className="flex items-center gap-3" key={labelKey}><Thumbnail variant="icon-outline" size="sm"><Icon /></Thumbnail>{t(labelKey)}</li>)}</ul>
            <form className="mt-10 w-full md:max-w-105" aria-label={t("landing.footer.subscribe")} onSubmit={submit} noValidate>
              <div className="flex items-start gap-2.5"><Input className="flex-1" inputSize="lg" value={email} onChange={(event) => { setEmail(event.target.value); setSubscribed(false); }} placeholder={t("landing.footer.emailPlaceholder")} aria-label={t("landing.footer.emailPlaceholder")} type="email" /><Button type="submit" size="icon-lg" aria-label={t("landing.footer.subscribe")}><ArrowUpRight /></Button></div>
              <div className="mt-3 text-sm"><p className="text-foreground-subtle" role="status">{subscribed ? t("landing.footer.thanks") : t("landing.footer.noNoise")}</p></div>
            </form>
            <nav className="mt-8 flex items-center gap-2" aria-label={t("landing.footer.social")}><a className={buttonVariants({ variant: "soft", size: "icon-md" })} href="https://x.com/Appica_dev" aria-label="X"><BrandX /></a><a className={buttonVariants({ variant: "soft", size: "icon-md" })} href="https://github.com/appica-dev/appica-ui" aria-label="GitHub"><BrandGithub /></a></nav>
          </div>
          <div className="max-md:order-first md:col-span-7"><FooterMedia /></div>
        </div>
        <div className="dark flex items-center justify-between gap-4 pb-6"><p className="text-foreground-subtle text-sm">{t("landing.footer.copyright")}</p><Button className="text-foreground-muted" variant="ghost" size="icon-md" aria-label={t("landing.footer.toTop")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowBarToUp className="size-5" /></Button></div>
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
