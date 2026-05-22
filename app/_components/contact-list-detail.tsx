"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Progress } from "@/app/_components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserMinus,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  Send,
  ChevronLeft,
  ChevronRight,
  Mail,
  Building2,
  Phone,
  Globe,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  isSubscribed: boolean;
  isComplained: boolean;
  isBounced: boolean;
  createdAt: Date;
}

interface ContactList {
  id: string;
  name: string;
  description?: string | null;
  // domainId is needed for creating overflow lists
  domainId: string;
  domain: { domain: string };
  _count: { contacts: number; emailHistory: number };
}

interface ContactListDetailProps {
  list: ContactList;
  initialContacts: Contact[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

const ITEMS_PER_PAGE = 50;
const MAX_CONTACTS = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADJECTIVES = [
  "Alpha",
  "Bravo",
  "Cedar",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golden",
  "Harbor",
  "Indigo",
  "Jade",
  "Kilo",
  "Lunar",
  "Maple",
  "Noble",
  "Ocean",
  "Prime",
];
const NOUNS = [
  "Batch",
  "Crew",
  "Draft",
  "Edge",
  "Fleet",
  "Group",
  "Hub",
  "Index",
  "Jet",
  "Keystone",
  "Layer",
  "Matrix",
  "Node",
  "Orbit",
  "Pack",
  "Queue",
];
const generateBaseName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function getStatusBadge(contact: Contact) {
  if (contact.isComplained)
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px]">
        Complained
      </Badge>
    );
  if (contact.isBounced)
    return (
      <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px]">
        Bounced
      </Badge>
    );
  if (!contact.isSubscribed)
    return (
      <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">
        Unsubscribed
      </Badge>
    );
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">
      Subscribed
    </Badge>
  );
}

// ── Add Contact Dialog ────────────────────────────────────────────────────────

function AddContactDialog({
  listId,
  onSuccess,
}: {
  listId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contact-lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: [
            {
              email: email.trim().toLowerCase(),
              firstName: firstName.trim() || undefined,
              lastName: lastName.trim() || undefined,
              company: company.trim() || undefined,
              phone: phone.trim() || undefined,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      toast.success("Contact added successfully.");
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setCompany("");
      setPhone("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Contact
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a single contact to this list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                placeholder="Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+1 555 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !email}>
                {isLoading ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Contact Dialog ───────────────────────────────────────────────────────

function EditContactDialog({
  listId,
  contact,
  onSuccess,
}: {
  listId: string;
  contact: Contact;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(contact.firstName || "");
  const [lastName, setLastName] = useState(contact.lastName || "");
  const [company, setCompany] = useState(contact.company || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [isSubscribed, setIsSubscribed] = useState(contact.isSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contact-lists/${listId}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          company: company.trim() || null,
          phone: phone.trim() || null,
          isSubscribed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update contact");
      toast.success("Contact updated.");
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        onClick={() => {
          setFirstName(contact.firstName || "");
          setLastName(contact.lastName || "");
          setCompany(contact.company || "");
          setPhone(contact.phone || "");
          setIsSubscribed(contact.isSubscribed);
          setError("");
          setOpen(true);
        }}
        title="Edit contact"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {contact.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={isSubscribed ? "subscribed" : "unsubscribed"}
                onValueChange={(v) => setIsSubscribed(v === "subscribed")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── CSV Import Dialog — with overflow splitting ───────────────────────────────

interface OverflowList {
  id: string;
  name: string;
  count: number;
}
interface ImportProgress {
  status: "idle" | "running" | "done" | "error";
  totalContacts: number;
  savedContacts: number;
  currentStep: string;
  overflowLists: OverflowList[];
  error?: string;
}

function CsvImportDialog({
  listId,
  listName,
  domainId,
  currentCount,
  onSuccess,
}: {
  listId: string;
  listName: string;
  domainId: string;
  currentCount: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CONTACTS - currentCount;
  const willOverflow = parsed.length > remaining;
  const overflowCount = Math.max(0, parsed.length - remaining);
  const newListsNeeded =
    overflowCount > 0 ? Math.ceil(overflowCount / MAX_CONTACTS) : 0;
  const totalLists = newListsNeeded + (remaining > 0 ? 1 : 0); // current list + new ones

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const emailIdx = headers.findIndex((h) => h === "email");
    const firstIdx = headers.findIndex((h) => h.includes("first"));
    const lastIdx = headers.findIndex((h) => h.includes("last"));
    const companyIdx = headers.findIndex(
      (h) => h.includes("company") || h === "org",
    );
    const phoneIdx = headers.findIndex(
      (h) => h.includes("phone") || h === "tel",
    );
    if (emailIdx === -1) throw new Error("CSV must have an 'email' column");
    return lines
      .slice(1)
      .map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/['"]/g, ""));
        const email = cols[emailIdx]?.toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        return {
          email,
          firstName: firstIdx >= 0 ? cols[firstIdx] || undefined : undefined,
          lastName: lastIdx >= 0 ? cols[lastIdx] || undefined : undefined,
          company: companyIdx >= 0 ? cols[companyIdx] || undefined : undefined,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || undefined : undefined,
        };
      })
      .filter(Boolean);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setParsed(parseCSV(ev.target?.result as string));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
        setParsed([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;

    const baseName = generateBaseName();
    const prog: ImportProgress = {
      status: "running",
      totalContacts: parsed.length,
      savedContacts: 0,
      currentStep: "",
      overflowLists: [],
    };
    setProgress({ ...prog });

    try {
      // ── Step 1: fill current list up to its remaining capacity ──────────
      const batch1 = parsed.slice(0, remaining);
      if (batch1.length > 0) {
        prog.currentStep = `Adding ${batch1.length} contacts to "${listName}"…`;
        setProgress({ ...prog });

        const res = await fetch(`/api/contact-lists/${listId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: batch1 }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to import into current list");
        prog.savedContacts += batch1.length;
        setProgress({ ...prog });
      }

      // ── Step 2: create new lists for overflow ──────────────────────────
      const overflow = parsed.slice(remaining);
      if (overflow.length > 0) {
        const overflowBatches = chunkArray(overflow, MAX_CONTACTS);
        for (let i = 0; i < overflowBatches.length; i++) {
          const batch = overflowBatches[i];
          const newName = `${baseName}-${i + 2}`;
          prog.currentStep = `Creating new list "${newName}" (${batch.length} contacts)…`;
          setProgress({ ...prog });

          const res = await fetch("/api/contact-lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, domainId, contacts: batch }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(
              data.error || `Failed to create overflow list ${i + 2}`,
            );

          prog.savedContacts += batch.length;
          prog.overflowLists.push({
            id: data.id,
            name: newName,
            count: batch.length,
          });
          setProgress({ ...prog });
        }
      }

      prog.status = "done";
      prog.currentStep = "All contacts imported!";
      setProgress({ ...prog });
      onSuccess();
    } catch (err) {
      prog.status = "error";
      prog.error = err instanceof Error ? err.message : "Import failed";
      setProgress({ ...prog });
    }
  };

  const reset = () => {
    setOpen(false);
    setParsed([]);
    setFileName("");
    setError("");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pct = progress
    ? Math.round((progress.savedContacts / progress.totalContacts) * 100)
    : 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && progress?.status === "running") return;
          if (!v) reset();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {progress ? "Importing Contacts…" : "Import Contacts from CSV"}
            </DialogTitle>
            <DialogDescription>
              {progress ? (
                `${progress.savedContacts} of ${progress.totalContacts} contacts saved`
              ) : (
                <>
                  Your CSV must have an{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    email
                  </code>{" "}
                  column.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* ── Progress view ───────────────────────────────────────────── */}
          {progress ? (
            <div className="space-y-4 mt-2">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{pct}% complete</span>
                  <span>
                    {progress.savedContacts} / {progress.totalContacts} contacts
                  </span>
                </div>
                <Progress
                  value={pct}
                  className={`h-2 ${progress.status === "done" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500 [&>div]:transition-all [&>div]:duration-300"}`}
                />
              </div>

              {/* Current step */}
              {progress.status === "running" && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                  {progress.currentStep}
                </div>
              )}

              {/* Error */}
              {progress.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{progress.error}</AlertDescription>
                </Alert>
              )}

              {/* New lists created */}
              {progress.overflowLists.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    New Lists Created
                  </p>
                  <div className="space-y-1.5">
                    {progress.overflowLists.map((l, i) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {l.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {l.count} contacts
                          </p>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                          Overflow {i + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Done */}
              {progress.status === "done" && (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    <strong>Import complete!</strong> {progress.savedContacts}{" "}
                    contacts saved
                    {progress.overflowLists.length > 0 &&
                      ` across ${progress.overflowLists.length + 1} lists`}
                    .
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                {progress.status === "done" || progress.status === "error" ? (
                  <Button onClick={reset}>
                    {progress.status === "done" ? "Close" : "Try Again"}
                  </Button>
                ) : (
                  <p className="text-xs text-gray-400">
                    Please keep this window open…
                  </p>
                )}
              </DialogFooter>
            </div>
          ) : (
            /* ── Normal upload view ─────────────────────────────────────── */
            <div className="space-y-4 mt-2">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ── BIG OVERFLOW WARNING ──────────────────────────────── */}
              {willOverflow && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong className="block mb-1">
                      This list can only hold {remaining} more contacts.
                    </strong>
                    Your CSV has <strong>{parsed.length} contacts</strong> — the
                    first <strong>{remaining}</strong> will be added to{" "}
                    <em>"{listName}"</em>, and the remaining{" "}
                    <strong>{overflowCount}</strong> will automatically be saved
                    into{" "}
                    <strong>
                      {newListsNeeded} new list{newListsNeeded !== 1 ? "s" : ""}
                    </strong>{" "}
                    on the same domain. No contacts will be lost. You can rename
                    the new lists afterwards from the contact lists page.
                  </AlertDescription>
                </Alert>
              )}

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  {fileName || "Click to upload CSV"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports .csv files
                </p>
                {!fileName && remaining < MAX_CONTACTS && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                    <Layers className="h-3 w-3" /> Large CSVs auto-split into
                    new lists
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              {/* Parsed summary */}
              {parsed.length > 0 && (
                <div
                  className={`p-3 rounded-xl border ${willOverflow ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}
                >
                  <p
                    className={`text-sm font-semibold ${willOverflow ? "text-blue-800" : "text-emerald-700"}`}
                  >
                    {willOverflow ? (
                      <Layers className="inline h-3.5 w-3.5 mr-1" />
                    ) : (
                      "✓ "
                    )}
                    {parsed.length} valid contacts found
                    {willOverflow &&
                      ` → ${totalLists} list${totalLists !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs mt-0.5 text-gray-500">
                    Preview:{" "}
                    {parsed
                      .slice(0, 3)
                      .map((c: any) => c.email)
                      .join(", ")}
                    {parsed.length > 3 ? ` +${parsed.length - 3} more` : ""}
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={parsed.length === 0}>
                  {willOverflow ? (
                    <>
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Import {parsed.length} contacts ({totalLists} lists)
                    </>
                  ) : (
                    `Import ${parsed.length} Contacts`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContactListDetail({
  list,
  initialContacts,
  initialTotal,
  initialPage,
  initialTotalPages,
}: ContactListDetailProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAllSelected =
    contacts.length > 0 && selectedIds.size === contacts.length;

  const fetchContacts = async (page = 1, searchQuery = search) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res = await fetch(`/api/contact-lists/${list.id}?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.pagination?.total ?? 0);
      setCurrentPage(data.pagination?.page ?? 1);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    fetchContacts(1, searchInput);
  };
  const handlePageChange = (page: number) => fetchContacts(page, search);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contact-lists/${list.id}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success(
        `Removed ${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""}.`,
      );
      fetchContacts(currentPage, search);
    } catch {
      toast.error("Failed to delete contacts.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "email",
      "firstName",
      "lastName",
      "company",
      "phone",
      "status",
    ];
    const rows = contacts.map((c) => [
      c.email,
      c.firstName || "",
      c.lastName || "",
      c.company || "",
      c.phone || "",
      c.isComplained
        ? "complained"
        : c.isBounced
          ? "bounced"
          : c.isSubscribed
            ? "subscribed"
            : "unsubscribed",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, "-")}-contacts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subscribedCount = contacts.filter(
    (c) => c.isSubscribed && !c.isBounced && !c.isComplained,
  ).length;
  const unsubscribedCount = contacts.filter((c) => !c.isSubscribed).length;
  const bouncedCount = contacts.filter((c) => c.isBounced).length;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/contact-lists">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {list.name}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              {list.description && (
                <p className="text-sm text-gray-500">{list.description}</p>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Globe className="h-3 w-3" /> {list.domain.domain}
              </span>
              <span className="text-xs text-gray-400">
                {list._count.emailHistory} campaign
                {list._count.emailHistory !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href={`/send-email?listId=${list.id}`}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send Campaign
          </Link>
        </Button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Contacts",
            value: total,
            icon: Users,
            gradient: "from-blue-600 to-blue-800",
            iconBg: "bg-blue-500/30",
          },
          {
            label: "Subscribed",
            value: subscribedCount,
            icon: UserCheck,
            gradient: "from-emerald-600 to-emerald-800",
            iconBg: "bg-emerald-500/30",
          },
          {
            label: "Unsubscribed",
            value: unsubscribedCount,
            icon: UserMinus,
            gradient: "from-gray-600 to-gray-800",
            iconBg: "bg-gray-500/30",
          },
          {
            label: "Bounced",
            value: bouncedCount,
            icon: AlertCircle,
            gradient: "from-orange-600 to-orange-800",
            iconBg: "bg-orange-500/30",
          },
        ].map(({ label, value, icon: Icon, gradient, iconBg }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${gradient}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold opacity-75 uppercase tracking-wider mb-1">
                  {label}
                </p>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              </div>
              <div className={`p-2 rounded-xl ${iconBg}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full border-8 border-white/5" />
          </div>
        ))}
      </div>

      {/* ── Contacts Table ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Contacts</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {total.toLocaleString()} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={contacts.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
            <CsvImportDialog
              listId={list.id}
              listName={list.name}
              domainId={list.domainId}
              currentCount={total}
              onSuccess={() => {
                fetchContacts(1, search);
                router.refresh();
              }}
            />
            <AddContactDialog
              listId={list.id}
              onSuccess={() => fetchContacts(1, search)}
            />
          </div>
        </div>

        {/* Search + bulk actions */}
        <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="text-xs text-gray-500 cursor-pointer select-none"
            >
              Select all ({contacts.length})
            </label>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {selectedIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove selected
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search contacts…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-8 text-sm w-56 rounded-lg"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              className="h-8"
            >
              Search
            </Button>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  fetchContacts(1, "");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              No contacts found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? "Try adjusting your search"
                : "Add contacts or import a CSV to get started"}
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[auto_1fr_150px_140px_100px_72px] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div />
              <div>Contact</div>
              <div>Company</div>
              <div>Phone</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-gray-50">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`grid grid-cols-[auto_1fr_150px_140px_100px_72px] gap-3 px-5 py-3 items-center hover:bg-gray-50/50 transition-colors ${selectedIds.has(contact.id) ? "bg-blue-50/40" : ""}`}
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {[contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(" ") || (
                        <span className="text-gray-400 font-normal italic text-xs">
                          No name
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {contact.email}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {contact.company ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0 text-gray-300" />
                        {contact.company}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {contact.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0 text-gray-300" />
                        {contact.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div>{getStatusBadge(contact)}</div>
                  <div className="flex items-center gap-0.5">
                    <EditContactDialog
                      listId={list.id}
                      contact={contact}
                      onSuccess={() => fetchContacts(currentPage, search)}
                    />
                    <button
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove contact"
                      onClick={async () => {
                        const res = await fetch(
                          `/api/contact-lists/${list.id}/contacts`,
                          {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contactIds: [contact.id] }),
                          },
                        );
                        if (res.ok) {
                          toast.success("Contact removed.");
                          fetchContacts(currentPage, search);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, total)} of{" "}
              {total.toLocaleString()} contacts
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-gray-600 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
