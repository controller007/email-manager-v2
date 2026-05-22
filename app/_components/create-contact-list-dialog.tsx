"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  AlertCircle,
  X,
  Plus,
  Globe,
  Upload,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { Domain, Sender } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONTACTS = 100;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

interface CreatedList {
  id: string;
  name: string;
  count: number;
}

interface BatchProgress {
  total: number;
  completed: number;
  current: number; // which batch (1-based)
  totalBatches: number;
  lists: CreatedList[];
  status: "idle" | "running" | "done" | "error";
  error?: string;
}

interface CreateContactListDialogProps {
  children: React.ReactNode;
  verifiedDomains: Array<Domain & { senders: Sender[] }>;
}

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
  "Quartz",
  "Ruby",
  "Sierra",
  "Tidal",
  "Ultra",
  "Vapor",
  "Willow",
  "Xenon",
  "Yellow",
  "Zenith",
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
  "Relay",
  "Segment",
  "Tier",
  "Unit",
  "Vault",
  "Wave",
  "Axis",
  "Bloom",
  "Crest",
];

const generateBaseName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidEmail(email: string) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

function parseEmailsFromText(input: string): {
  valid: string[];
  invalid: string[];
} {
  const raw = input
    .split(/[,;\s\n\t]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .filter((e, i, arr) => arr.indexOf(e) === i);

  const valid: string[] = [];
  const invalid: string[] = [];
  raw.forEach((e) => (isValidEmail(e) ? valid.push(e) : invalid.push(e)));
  return { valid, invalid };
}

function parseCSV(text: string): {
  contacts: ParsedContact[];
  errors: string[];
} {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2)
    return {
      contacts: [],
      errors: ["CSV must have a header row and at least one data row."],
    };

  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase(),
  );

  const emailIdx = headers.findIndex(
    (h) => h === "email" || h === "email address" || h === "e-mail",
  );
  if (emailIdx === -1)
    return { contacts: [], errors: ["CSV must have an 'email' column."] };

  const firstNameIdx = headers.findIndex(
    (h) => h.includes("first") || h === "firstname",
  );
  const lastNameIdx = headers.findIndex(
    (h) => h.includes("last") || h === "lastname",
  );
  const companyIdx = headers.findIndex(
    (h) =>
      h.includes("company") || h.includes("organization") || h.includes("org"),
  );
  const phoneIdx = headers.findIndex(
    (h) => h.includes("phone") || h.includes("mobile") || h.includes("tel"),
  );

  const contacts: ParsedContact[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const email = cols[emailIdx]?.toLowerCase().trim();
    if (!email) continue;
    if (!isValidEmail(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}"`);
      continue;
    }
    contacts.push({
      email,
      firstName:
        firstNameIdx >= 0 ? cols[firstNameIdx]?.trim() || undefined : undefined,
      lastName:
        lastNameIdx >= 0 ? cols[lastNameIdx]?.trim() || undefined : undefined,
      company:
        companyIdx >= 0 ? cols[companyIdx]?.trim() || undefined : undefined,
      phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
    });
  }

  return { contacts, errors };
}

/** Split an array into chunks of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Batch Progress UI ─────────────────────────────────────────────────────────

function BatchProgressView({ progress }: { progress: BatchProgress }) {
  const pct = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <Layers className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {progress.status === "done"
              ? "Import Complete!"
              : `Creating list ${progress.current} of ${progress.totalBatches}…`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {progress.completed} of {progress.total} contacts saved
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{pct}% complete</span>
          <span>
            {progress.totalBatches} list
            {progress.totalBatches !== 1 ? "s" : ""} total
          </span>
        </div>
        <Progress
          value={pct}
          className={`h-2 ${
            progress.status === "done"
              ? "[&>div]:bg-emerald-500"
              : "[&>div]:bg-blue-500 [&>div]:transition-all [&>div]:duration-300"
          }`}
        />
      </div>

      {/* Error */}
      {progress.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{progress.error}</AlertDescription>
        </Alert>
      )}

      {/* Created lists */}
      {progress.lists.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lists Created
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {progress.lists.map((list, i) => (
              <div
                key={list.id}
                className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {list.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {list.count} contact{list.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                  List {i + 1}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running spinner row */}
      {progress.status === "running" && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          Please keep this window open while contacts are being saved…
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function CreateContactListDialog({
  children,
  verifiedDomains,
}: CreateContactListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(generateBaseName());
  const [domainId, setDomainId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "csv">("paste");
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null,
  );
  const router = useRouter();

  // Paste tab state
  const [emailsInput, setEmailsInput] = useState("");
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);

  // CSV tab state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContacts, setCsvContacts] = useState<ParsedContact[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDomain = verifiedDomains.find((d) => d.id === domainId);

  // Active contacts based on tab
  const activeContacts: ParsedContact[] =
    activeTab === "paste"
      ? validEmails.map((email) => ({ email }))
      : csvContacts;

  const contactCount = activeContacts.length;
  const needsSplitting = contactCount > MAX_CONTACTS;
  const batchCount = needsSplitting
    ? Math.ceil(contactCount / MAX_CONTACTS)
    : 1;

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("domain");
      setDomainId(verifiedDomains.find((d) => d.domain === saved)?.id || "");
      setName(generateBaseName());
      setBatchProgress(null);
    }
  }, [open]);

  // ── Paste tab handlers ──────────────────────────────────────────────────────

  const handleEmailsInputChange = (value: string) => {
    setEmailsInput(value);
    if (!value.trim()) {
      setValidEmails([]);
      setInvalidEmails([]);
      return;
    }
    const { valid, invalid } = parseEmailsFromText(value);
    setValidEmails(valid);
    setInvalidEmails(invalid);
  };

  const removeInvalidEmail = (email: string) => {
    setInvalidEmails((prev) => prev.filter((e) => e !== email));
    const updated = parseEmailsFromText(emailsInput).valid.filter(
      (e) => e !== email,
    );
    setEmailsInput(updated.join(", "));
    setValidEmails(updated);
  };

  // ── CSV tab handlers ────────────────────────────────────────────────────────

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setCsvErrors(["Please upload a .csv file."]);
      return;
    }
    setCsvFile(file);
    setCsvErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { contacts, errors } = parseCSV(text);
      const seen = new Set<string>();
      const deduped = contacts.filter((c) => {
        if (seen.has(c.email)) return false;
        seen.add(c.email);
        return true;
      });
      setCsvContacts(deduped);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Submit — single or batch ───────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!domainId) {
      setError("Please select a domain.");
      return;
    }
    if (activeTab === "paste" && invalidEmails.length > 0) {
      setError("Please remove invalid email addresses first.");
      return;
    }
    if (activeContacts.length === 0) {
      setError("Please add at least one valid contact.");
      return;
    }

    setIsLoading(true);

    const batches = chunkArray(activeContacts, MAX_CONTACTS);
    const baseName = name.trim();

    // Single batch — original simple flow
    if (batches.length === 1) {
      try {
        const listRes = await fetch("/api/contact-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: baseName,
            domainId,
            emails: batches[0].map((c) => c.email),
            contacts: batches[0],
          }),
        });
        const listData = await listRes.json();
        if (!listRes.ok)
          throw new Error(listData.error || "Failed to create contact list");

        if (
          activeTab === "csv" &&
          batches[0].some((c) => c.firstName || c.lastName || c.company)
        ) {
          await fetch(`/api/contact-lists/${listData.id}/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contacts: batches[0] }),
          }).catch(() => {});
        }

        resetAndClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Multi-batch flow — show progress UI
    const progress: BatchProgress = {
      total: activeContacts.length,
      completed: 0,
      current: 0,
      totalBatches: batches.length,
      lists: [],
      status: "running",
    };
    setBatchProgress({ ...progress });

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchName = i === 0 ? baseName : `${baseName}-${i + 1}`;

        progress.current = i + 1;
        setBatchProgress({ ...progress });

        const listRes = await fetch("/api/contact-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: batchName,
            domainId,
            emails: batch.map((c) => c.email),
            contacts: batch,
          }),
        });
        const listData = await listRes.json();
        if (!listRes.ok)
          throw new Error(listData.error || `Failed to create list ${i + 1}`);

        // Enrich with CSV fields if needed
        if (
          activeTab === "csv" &&
          batch.some((c) => c.firstName || c.lastName || c.company)
        ) {
          await fetch(`/api/contact-lists/${listData.id}/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contacts: batch }),
          }).catch(() => {});
        }

        progress.completed += batch.length;
        progress.lists.push({
          id: listData.id,
          name: batchName,
          count: batch.length,
        });
        setBatchProgress({ ...progress });
      }

      // Done
      progress.status = "done";
      setBatchProgress({ ...progress });
      router.refresh();
    } catch (err) {
      progress.status = "error";
      progress.error = err instanceof Error ? err.message : "An error occurred";
      setBatchProgress({ ...progress });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setName("");
    setDomainId("");
    setEmailsInput("");
    setValidEmails([]);
    setInvalidEmails([]);
    setCsvFile(null);
    setCsvContacts([]);
    setCsvErrors([]);
    setActiveTab("paste");
    setBatchProgress(null);
  };

  const canSubmit =
    !isLoading &&
    domainId &&
    verifiedDomains.length > 0 &&
    activeContacts.length > 0 &&
    (activeTab === "paste" ? invalidEmails.length === 0 : true);

  const isDone = batchProgress?.status === "done";
  const isRunning = batchProgress?.status === "running";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Prevent closing mid-batch
        if (!v && isRunning) return;
        if (!v) resetAndClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {batchProgress ? "Importing Contacts" : "Create Contact List"}
          </DialogTitle>
          <DialogDescription>
            {batchProgress
              ? isDone
                ? `All ${batchProgress.totalBatches} lists created successfully.`
                : `Splitting ${contactCount} contacts across ${batchProgress.totalBatches} lists of up to ${MAX_CONTACTS} each…`
              : `Create a new contact list. Maximum ${MAX_CONTACTS} contacts per list — larger CSVs are automatically split.`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Batch progress view ─────────────────────────────────────── */}
        {batchProgress ? (
          <div className="py-2">
            <BatchProgressView progress={batchProgress} />
            {isDone && (
              <div className="mt-5 flex justify-end">
                <Button onClick={resetAndClose}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
              </div>
            )}
            {batchProgress.status === "error" && (
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBatchProgress(null);
                    setIsLoading(false);
                  }}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── Normal form ──────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {verifiedDomains.length === 0 && (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <strong>No verified domains.</strong> Add and verify a domain
                  before creating contact lists.
                </AlertDescription>
              </Alert>
            )}

            {/* Domain */}
            <div className="space-y-2">
              <Label>Select Domain *</Label>
              <Select
                value={domainId}
                onValueChange={setDomainId}
                disabled={isLoading || verifiedDomains.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a verified domain" />
                </SelectTrigger>
                <SelectContent>
                  {verifiedDomains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{domain.domain}</span>
                        <Badge variant="outline" className="text-xs">
                          {domain.senders.length} sender
                          {domain.senders.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Base List Name *</Label>
              <Input
                placeholder="e.g., Newsletter Subscribers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
              {needsSplitting && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Lists will be named: <strong>{name}</strong>,{" "}
                  <strong>{name}-2</strong>, <strong>{name}-3</strong>…
                </p>
              )}
            </div>

            {/* Splitting notice — shown when CSV is large */}
            {needsSplitting ? (
              <Alert className="border-blue-200 bg-blue-50">
                <Layers className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Auto-split enabled.</strong> Your {contactCount}{" "}
                  contacts will be split into{" "}
                  <strong>{batchCount} lists</strong> of up to {MAX_CONTACTS}{" "}
                  contacts each. All contacts will be saved automatically with a
                  live progress view.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>{MAX_CONTACTS} contact maximum per list.</strong> If
                  you upload a larger CSV it will be split into multiple lists
                  automatically — no contacts will be lost.
                </AlertDescription>
              </Alert>
            )}

            {/* Contacts input — tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "paste" | "csv")}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="paste">Paste Emails</TabsTrigger>
                <TabsTrigger value="csv">Import CSV</TabsTrigger>
              </TabsList>

              {/* ── Paste tab ──────────────────────────────────────────── */}
              <TabsContent value="paste" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label>Email Addresses *</Label>
                  <Textarea
                    placeholder={
                      "Paste emails separated by commas, spaces, or new lines:\nexample@domain.com, user@company.com\nanother@email.com"
                    }
                    value={emailsInput}
                    onChange={(e) => handleEmailsInputChange(e.target.value)}
                    rows={8}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-400">
                    Separate emails with commas, spaces, or new lines.
                  </p>
                </div>

                {validEmails.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-green-700">
                        Valid ({validEmails.length})
                      </Label>
                      {needsSplitting && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Split into {batchCount}{" "}
                          lists
                        </Badge>
                      )}
                    </div>
                    <div className="max-h-32 overflow-y-auto p-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {validEmails.slice(0, 20).map((email, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {email}
                          </Badge>
                        ))}
                        {validEmails.length > 20 && (
                          <Badge variant="secondary" className="text-xs">
                            +{validEmails.length - 20} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {invalidEmails.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-red-600">
                      Invalid ({invalidEmails.length})
                    </Label>
                    <div className="max-h-24 overflow-y-auto p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {invalidEmails.map((email, i) => (
                          <Badge
                            key={i}
                            variant="destructive"
                            className="text-xs flex items-center gap-1"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeInvalidEmail(email)}
                              className="ml-0.5 hover:bg-red-700 rounded-full p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-red-600">
                      Remove or fix these before saving.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ── CSV tab ────────────────────────────────────────────── */}
              <TabsContent value="csv" className="space-y-3 mt-4">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {csvFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {csvFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {csvContacts.length} contacts parsed
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCsvFile(null);
                          setCsvContacts([]);
                          setCsvErrors([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        Drop your CSV here or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Required column:{" "}
                        <code className="bg-gray-100 px-1 rounded">email</code>
                      </p>
                      <p className="text-xs text-gray-400">
                        Optional:{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          first_name
                        </code>
                        ,{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          last_name
                        </code>
                        ,{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          company
                        </code>
                        ,{" "}
                        <code className="bg-gray-100 px-1 rounded">phone</code>
                      </p>
                      <p className="text-xs text-blue-500 font-medium mt-1 flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Large CSVs are automatically split into multiple lists
                      </p>
                    </div>
                  )}
                </div>

                {csvErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                    {csvErrors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-red-600">
                        {err}
                      </p>
                    ))}
                    {csvErrors.length > 5 && (
                      <p className="text-xs text-red-400">
                        +{csvErrors.length - 5} more errors
                      </p>
                    )}
                  </div>
                )}

                {csvContacts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {csvContacts.length} contact
                        {csvContacts.length !== 1 ? "s" : ""} found
                      </Label>
                      {needsSplitting && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {batchCount} lists
                        </Badge>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">
                              Email
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">
                              Name
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">
                              Company
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {csvContacts.slice(0, 50).map((c, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-700 truncate max-w-[180px]">
                                {c.email}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {[c.firstName, c.lastName]
                                  .filter(Boolean)
                                  .join(" ") || (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {c.company || (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvContacts.length > 50 && (
                        <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                          +{csvContacts.length - 50} more rows…
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Count / split summary */}
            {contactCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  {needsSplitting ? (
                    <>
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {contactCount} contacts →{" "}
                        <strong>{batchCount} lists</strong> of up to{" "}
                        {MAX_CONTACTS}
                      </span>
                      <span className="text-gray-400">
                        All contacts will be saved
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500">
                        {contactCount} of {MAX_CONTACTS} max contacts
                      </span>
                    </>
                  )}
                </div>
                <Progress
                  value={Math.min((contactCount / MAX_CONTACTS) * 100, 100)}
                  className={`h-1.5 ${
                    needsSplitting
                      ? "[&>div]:bg-blue-500"
                      : "[&>div]:bg-blue-500"
                  }`}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating…
                  </>
                ) : needsSplitting ? (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    Import {contactCount} contacts ({batchCount} lists)
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create List ({contactCount} contacts)
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
