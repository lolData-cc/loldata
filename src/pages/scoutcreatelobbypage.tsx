// /scout/new — wizard for creating a scout-feed lobby.
// Style follows the "This Season" box on the summoner page:
// glass dark background, BorderBeam, small mono headers with gradient rule,
// jade accents, jetbrains body.

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Check, Loader2, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, SITE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

/* ─── constants ───────────────────────────────────────────────────────── */
const MAX_PLAYERS = 20;
const MAX_ACCOUNTS = 3;

const REGIONS = ["EUW", "NA", "KR"] as const;
type Region = (typeof REGIONS)[number];

const JADE = "#00d992";
const JADE_DIM = "rgba(0,217,146,0.08)";

/* ─── types ───────────────────────────────────────────────────────────── */
type Account = {
  uid: string;
  puuid: string;
  region: Region;
  riotName: string;
  riotTag: string;
};

type DraftPlayer = {
  uid: string;
  displayName: string;
  accounts: Account[];
};

type CreateResult = { slug: string; ownerKey: string };

function makeUid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── glass card style (mirrors summonerpage "This Season" box) ──────── */
const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/15 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
);

/* Soft jade radial glow that sits behind the card content so the surface
   reads brighter without losing the dark theme. Two stops: a focused
   highlight near the top + a fainter wash at the bottom right. */
function GlowBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 30% 0%, rgba(0,217,146,0.10) 0%, transparent 65%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 120% 80% at 50% 50%, rgba(255,255,255,0.025) 0%, transparent 70%)
        `,
        filter: "blur(20px)",
      }}
    />
  );
}

/* ─── small header bar (◈ :: SECTION :: tag) ─────────────────────────── */
function SectionHeader({
  label,
  meta,
  right,
}: {
  label: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
      <span className="text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium">
        {label}
      </span>
      {meta && (
        <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/45">
          {meta}
        </span>
      )}
      <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
      {right}
    </div>
  );
}

/* ─── field label (◆ Label) — sits above an input ──────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/65 flex items-center gap-1.5 mb-2">
      <span className="text-jade/70" style={{ fontSize: "9px" }}>◆</span>
      {children}
    </span>
  );
}

/* ─── fluid input — bigger, animated focus state ────────────────────── */
type FluidInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & { size?: "md" | "lg" };

const FluidInput = ({
  size = "md",
  className,
  ...props
}: FluidInputProps) => {
  const sizing =
    size === "lg"
      ? "h-14 px-4 text-[17px]"
      : "h-11 px-3.5 text-[14px]";
  return (
    <div className="relative group">
      {/* glow ring on focus */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[3px] pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow:
            "0 0 0 1px rgba(0,217,146,0.45), 0 0 18px rgba(0,217,146,0.18)",
        }}
      />
      <input
        {...props}
        className={cn(
          "relative w-full bg-black/30 border border-flash/15 rounded-[3px] text-flash placeholder:text-flash/35 outline-none",
          "transition-[border-color,background-color] duration-200",
          "group-focus-within:border-jade/0 group-hover:border-flash/25",
          "group-focus-within:bg-black/40",
          sizing,
          className
        )}
      />
    </div>
  );
};

/* ─── fluid button — three variants, all animated ───────────────────── */
type FluidBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
};

function FluidButton({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className,
  disabled,
  ...rest
}: FluidBtnProps) {
  const sizing = {
    sm: "h-8 px-3 text-[11px] tracking-[0.18em]",
    md: "h-10 px-4 text-[12px] tracking-[0.2em]",
    lg: "h-12 px-6 text-[13px] tracking-[0.22em]",
  }[size];

  const palette = disabled
    ? "border-flash/10 text-flash/25 bg-transparent cursor-not-allowed"
    : variant === "primary"
    ? cn(
        "border-jade/40 text-jade bg-jade/[0.10]",
        "hover:bg-jade/[0.20] hover:border-jade/60 hover:text-jade",
        "shadow-[0_0_24px_rgba(0,217,146,0.18),inset_0_0_24px_rgba(0,217,146,0.06)]",
        "hover:shadow-[0_0_32px_rgba(0,217,146,0.30),inset_0_0_28px_rgba(0,217,146,0.10)]"
      )
    : variant === "secondary"
    ? cn(
        "border-jade/25 text-jade/85 bg-jade/[0.05]",
        "hover:bg-jade/[0.12] hover:border-jade/45 hover:text-jade"
      )
    : cn(
        "border-flash/15 text-flash/60 bg-transparent",
        "hover:bg-flash/[0.06] hover:border-flash/25 hover:text-flash/80"
      );

  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-[3px] border",
        "font-jetbrains font-medium uppercase cursor-clicker",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
        "disabled:hover:translate-y-0 disabled:hover:scale-100",
        sizing,
        palette,
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ─── account row ─────────────────────────────────────────────────────── */
function AccountRow({
  account,
  onRemove,
}: {
  account: Account;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[3px] hover:bg-flash/[0.04] transition-colors group">
      <Check className="w-3.5 h-3.5 text-jade shrink-0" />
      <span className="text-[11px] font-jetbrains font-medium tracking-[0.18em] uppercase text-jade/70 w-10">
        {account.region}
      </span>
      <span className="text-sm font-geist text-flash/90 truncate">
        {account.riotName}
        <span className="text-flash/40">#{account.riotTag}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto text-flash/30 hover:text-error transition-colors cursor-clicker opacity-60 group-hover:opacity-100 p-0.5"
        aria-label="Remove account"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── account input (add new) ─────────────────────────────────────────── */
function AccountAdder({
  onAdd,
  disabled,
}: {
  onAdd: (acc: Account) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>("EUW");
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [raw, setRaw] = useState(""); // "name#tag"
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const m = raw.trim().match(/^(.+)#(.+)$/);
    if (!m) {
      setError("Format: name#tag");
      return;
    }
    const name = m[1].trim();
    const tag = m[2].trim();
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/summoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, region }),
      });
      if (!res.ok) {
        setError("Account not found");
        setVerifying(false);
        return;
      }
      const data = await res.json();
      const sum = data?.summoner;
      if (!sum?.puuid) {
        setError("Account not found");
        setVerifying(false);
        return;
      }
      onAdd({
        uid: makeUid(),
        puuid: sum.puuid,
        region,
        riotName: sum.name ?? name,
        riotTag: sum.tag ?? tag,
      });
      setRaw("");
      setOpen(false);
    } catch (err) {
      setError("Network error");
    } finally {
      setVerifying(false);
    }
  };

  if (!open) {
    return (
      <FluidButton
        onClick={() => setOpen(true)}
        disabled={disabled}
        variant="ghost"
        size="sm"
        icon={<Plus className="w-3.5 h-3.5" />}
      >
        Add account
      </FluidButton>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Single bar: [name#tag input grows] [REGION combobox] [Add] [×] */}
      <div className="flex items-stretch gap-2 w-full">
        <div className="relative group flex-1 min-w-0">
          {/* glow ring on focus */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-[3px] pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
            style={{
              boxShadow:
                "0 0 0 1px rgba(0,217,146,0.45), 0 0 18px rgba(0,217,146,0.18)",
            }}
          />
          <input
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="name#tag"
            className={cn(
              "relative w-full h-10 px-3.5 bg-black/30 border border-flash/15 rounded-[3px]",
              "text-[14px] text-flash placeholder:text-flash/35 outline-none",
              "transition-[border-color,background-color] duration-200",
              "group-focus-within:border-jade/0 group-hover:border-flash/25",
              "group-focus-within:bg-black/40"
            )}
          />
        </div>

        <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "h-10 w-[78px] justify-between bg-black/30 border border-flash/15",
                "font-jetbrains text-[12px] tracking-[0.18em] uppercase text-flash/85",
                "hover:border-flash/25 hover:bg-black/40"
              )}
            >
              {region}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="pointer-events-auto z-[9999] w-[100px] p-0 bg-liquirice/90 border-flash/20 cursor-clicker">
            <Command>
              <CommandList>
                <CommandEmpty>No region found.</CommandEmpty>
                <CommandGroup>
                  {REGIONS.map((r) => (
                    <CommandItem
                      key={r}
                      value={r}
                      onSelect={() => {
                        setRegion(r);
                        setRegionPopoverOpen(false);
                      }}
                      className="font-jetbrains tracking-[0.18em] uppercase"
                    >
                      {r}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <FluidButton
          onClick={submit}
          disabled={verifying}
          variant="primary"
          size="md"
          icon={verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        >
          {verifying ? "Verifying" : "Add"}
        </FluidButton>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setRaw("");
            setError(null);
          }}
          className="text-flash/40 hover:text-flash/80 transition-colors cursor-clicker p-1 self-center"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <span className="text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 pl-1 flex items-center gap-1.5 animate-in fade-in duration-200">
          <span style={{ fontSize: "9px" }}>◆</span> {error}
        </span>
      )}
    </div>
  );
}

/* ─── single player card ──────────────────────────────────────────────── */
function PlayerCard({
  index,
  player,
  onChange,
  onRemove,
}: {
  index: number;
  player: DraftPlayer;
  onChange: (next: DraftPlayer) => void;
  onRemove: () => void;
}) {
  const addAccount = (acc: Account) =>
    onChange({ ...player, accounts: [...player.accounts, acc] });

  const removeAccount = (uid: string) =>
    onChange({
      ...player,
      accounts: player.accounts.filter((a) => a.uid !== uid),
    });

  const slotLabel = `P${String(index + 1).padStart(2, "0")}`;

  return (
    <div
      className="relative rounded-[2px] overflow-hidden bg-black/20 border border-flash/15"
      style={{
        boxShadow:
          "inset 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: `color-mix(in srgb, ${JADE} 35%, transparent)` }}
      />

      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[11px] font-jetbrains font-medium tracking-[0.22em] uppercase px-2 py-1 rounded-[2px]"
            style={{
              color: JADE,
              background: JADE_DIM,
              border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
            }}
          >
            {slotLabel}
          </span>
          <input
            value={player.displayName}
            onChange={(e) =>
              onChange({ ...player, displayName: e.target.value })
            }
            placeholder="Player name"
            maxLength={40}
            className={cn(
              "flex-1 bg-transparent text-base font-geist text-flash placeholder:text-flash/30 outline-none",
              "border-b border-flash/0 focus:border-jade/40 hover:border-flash/15",
              "transition-colors duration-200 py-1"
            )}
          />
          <span className="text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 shrink-0">
            {player.accounts.length}/{MAX_ACCOUNTS}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-flash/35 hover:text-error transition-colors cursor-clicker p-1 -mr-1"
            aria-label="Remove player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 pl-1">
          {player.accounts.map((a) => (
            <AccountRow
              key={a.uid}
              account={a}
              onRemove={() => removeAccount(a.uid)}
            />
          ))}
          <div className="pt-2">
            <AccountAdder
              onAdd={addAccount}
              disabled={player.accounts.length >= MAX_ACCOUNTS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── success dialog (after lobby created) ───────────────────────────── */
function CreatedDialog({
  result,
  onClose,
  onOpenLobby,
}: {
  result: CreateResult;
  onClose: () => void;
  onOpenLobby: () => void;
}) {
  const [copiedField, setCopiedField] = useState<"link" | "edit" | null>(null);

  const lobbyUrl = `${SITE_URL}/scout/${result.slug}`;
  const editUrl = `${SITE_URL}/scout/${result.slug}/edit?key=${result.ownerKey}`;

  const copy = async (value: string, field: "link" | "edit") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[480px] font-geist [&>button]:hidden">
        <DialogTitle className="sr-only">Lobby created</DialogTitle>
        <div
          className="relative rounded-[2px] overflow-hidden"
          style={{
            background: "rgba(8,16,20,0.92)",
            backdropFilter: "blur(12px)",
            border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
          }}
        >
          {/* Radial glow backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 30% 0%, rgba(0,217,146,0.12) 0%, transparent 65%),
                radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,0.06) 0%, transparent 70%)
              `,
              filter: "blur(16px)",
            }}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px] z-[1]"
            style={{ background: `color-mix(in srgb, ${JADE} 55%, transparent)` }}
          />
          <div className="relative z-10 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-5 text-[12px] font-jetbrains tracking-[0.22em] uppercase">
              <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
              <span className="text-flash/45">::</span>
              <span
                className="px-2 py-0.5 font-medium"
                style={{
                  color: JADE,
                  background: JADE_DIM,
                  border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
                  borderRadius: "2px",
                }}
              >
                LOBBY CREATED
              </span>
              <span className="text-flash/45">::</span>
              <span className="text-flash/55">{result.slug}</span>
            </div>

            <p className="text-flash/80 text-[14px] mb-5 leading-relaxed">
              Share the public link with anyone — they'll see the feed and
              leaderboards. Keep the edit link private; it grants modification
              rights.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <LinkRow
                label="Public link"
                value={lobbyUrl}
                copied={copiedField === "link"}
                onCopy={() => copy(lobbyUrl, "link")}
              />
              <LinkRow
                label="Edit link"
                value={editUrl}
                copied={copiedField === "edit"}
                onCopy={() => copy(editUrl, "edit")}
                emphasis="warn"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <FluidButton onClick={onClose} variant="ghost" size="md">
                Close
              </FluidButton>
              <FluidButton
                onClick={onOpenLobby}
                variant="primary"
                size="md"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open lobby
              </FluidButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({
  label,
  value,
  copied,
  onCopy,
  emphasis,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  emphasis?: "warn";
}) {
  const accent = emphasis === "warn" ? "#FFB615" : JADE;
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-jetbrains tracking-[0.18em] uppercase flex items-center gap-1.5"
        style={{ color: `color-mix(in srgb, ${accent} 75%, transparent)` }}
      >
        <span style={{ fontSize: "9px" }}>◆</span> {label}
      </span>
      <div className="flex items-center gap-2 bg-black/30 border border-flash/15 rounded-[3px] px-3 py-2.5 hover:border-flash/25 transition-colors">
        <code className="flex-1 text-[13px] font-jetbrains text-flash/90 truncate">{value}</code>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "text-[11px] font-jetbrains tracking-[0.18em] uppercase px-3 py-1.5 rounded-[3px] border cursor-clicker",
            "flex items-center gap-1.5 transition-all duration-200",
            copied
              ? "border-jade/40 text-jade bg-jade/[0.10]"
              : "border-flash/20 text-flash/70 hover:bg-flash/[0.06] hover:border-flash/35 hover:text-flash"
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────── */
export default function ScoutCreateLobbyPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [lobbyName, setLobbyName] = useState("");
  const [players, setPlayers] = useState<DraftPlayer[]>(() => [
    { uid: makeUid(), displayName: "", accounts: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  const addPlayer = useCallback(() => {
    setPlayers((prev) => {
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, { uid: makeUid(), displayName: "", accounts: [] }];
    });
  }, []);

  const updatePlayer = useCallback(
    (uid: string, next: DraftPlayer) => {
      setPlayers((prev) => prev.map((p) => (p.uid === uid ? next : p)));
    },
    []
  );

  const removePlayer = useCallback((uid: string) => {
    setPlayers((prev) => prev.filter((p) => p.uid !== uid));
  }, []);

  const { canSubmit, totalAccounts } = useMemo(() => {
    let total = 0;
    let valid = true;
    if (!lobbyName.trim()) valid = false;
    if (players.length === 0) valid = false;
    for (const p of players) {
      if (!p.displayName.trim()) valid = false;
      if (p.accounts.length === 0) valid = false;
      total += p.accounts.length;
    }
    return { canSubmit: valid, totalAccounts: total };
  }, [lobbyName, players]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        setSubmitError("You must be logged in");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/scout/lobby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: lobbyName.trim(),
          isPublic: true,
          players: players.map((p) => ({
            displayName: p.displayName.trim(),
            accounts: p.accounts.map((a) => ({
              puuid: a.puuid,
              region: a.region,
              riotName: a.riotName,
              riotTag: a.riotTag,
            })),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Failed to create lobby");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as CreateResult;
      setCreateResult(data);
    } catch (err) {
      console.error(err);
      setSubmitError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // basic guardrail — AuthGuard wraps the route, but if session goes away mid-page:
  if (!session) return null;

  return (
    <div className="w-full flex justify-center pt-8 pb-24 font-geist">
      <div className="w-full max-w-[860px]">
        <div className={glassDark}>
          <GlowBackdrop />
          <BorderBeam duration={10} size={120} />
          <div className="relative z-10 p-8">
            {/* top header */}
            <SectionHeader
              label="Scout"
              meta=":: NEW LOBBY"
              right={
                <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/50">
                  {players.length}/{MAX_PLAYERS} players · {totalAccounts} accounts
                </span>
              }
            />

            {/* lobby name */}
            <div className="mt-6">
              <FieldLabel>Lobby name</FieldLabel>
              <FluidInput
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                placeholder="e.g. Friday Night Crew"
                maxLength={80}
                size="lg"
              />
            </div>

            {/* players section */}
            <div className="mt-7">
              <SectionHeader
                label="Players"
                meta={`${players.length}/${MAX_PLAYERS}`}
                right={
                  <FluidButton
                    onClick={addPlayer}
                    disabled={players.length >= MAX_PLAYERS}
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Player
                  </FluidButton>
                }
              />

              <div className="mt-4 flex flex-col gap-3">
                {players.map((p, i) => (
                  <PlayerCard
                    key={p.uid}
                    index={i}
                    player={p}
                    onChange={(next) => updatePlayer(p.uid, next)}
                    onRemove={() => removePlayer(p.uid)}
                  />
                ))}
              </div>
            </div>

            {/* footer / submit */}
            <div className="mt-8 flex flex-col gap-3">
              {submitError && (
                <span className="text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 flex items-center gap-1.5">
                  <span style={{ fontSize: "9px" }}>◆</span> {submitError}
                </span>
              )}
              <div className="flex justify-end">
                <FluidButton
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  variant="primary"
                  size="lg"
                  icon={
                    submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span style={{ fontSize: "10px" }}>◈</span>
                    )
                  }
                >
                  {submitting ? "Creating" : "Create lobby"}
                </FluidButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {createResult && (
        <CreatedDialog
          result={createResult}
          onClose={() => {
            setCreateResult(null);
            // soft reset: keep the form? for now we navigate so the user
            // doesn't re-submit the same lobby by accident.
            navigate(`/scout/${createResult.slug}`);
          }}
          onOpenLobby={() => navigate(`/scout/${createResult.slug}`)}
        />
      )}
    </div>
  );
}
