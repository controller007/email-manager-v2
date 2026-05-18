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
  CheckCircle,
  Globe,
  Upload,
  FileText,
  Users,
  AlertTriangle,
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

interface CreateContactListDialogProps {
  children: React.ReactNode;
  verifiedDomains: Array<Domain & { senders: Sender[] }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateId = () => "List-" + Math.random().toString(36).substr(2, 7);

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

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function CreateContactListDialog({
  children,
  verifiedDomains,
}: CreateContactListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(generateId());
  const [domainId, setDomainId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "csv">("paste");
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
  const isOverLimit = contactCount > MAX_CONTACTS;
  const contactsToSubmit = activeContacts.slice(0, MAX_CONTACTS);

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("domain");
      setDomainId(verifiedDomains.find((d) => d.domain === saved)?.id || "");
      setName(generateId());
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
      // Deduplicate
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

  // ── Submit ─────────────────────────────────────────────────────────────────

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
    if (contactsToSubmit.length === 0) {
      setError("Please add at least one valid contact.");
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Create the list
      const listRes = await fetch("/api/contact-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domainId,
          emails: contactsToSubmit.map((c) => c.email),
          contacts: contactsToSubmit,
        }),
      });

      const listData = await listRes.json();
      if (!listRes.ok)
        throw new Error(listData.error || "Failed to create contact list");

      // Step 2: If CSV with rich fields, add contacts via contacts endpoint
      if (
        activeTab === "csv" &&
        contactsToSubmit.some((c) => c.firstName || c.lastName || c.company)
      ) {
        const contactsRes = await fetch(
          `/api/contact-lists/${listData.id}/contacts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contacts: contactsToSubmit }),
          },
        );
        // Non-fatal if this fails — emails are already stored
        if (!contactsRes.ok) {
          console.warn(
            "Failed to enrich contacts with CSV fields, but list was created.",
          );
        }
      }

      // Reset
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    !isLoading &&
    domainId &&
    verifiedDomains.length > 0 &&
    contactsToSubmit.length > 0 &&
    (activeTab === "paste" ? invalidEmails.length === 0 : true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contact List</DialogTitle>
          <DialogDescription>
            Create a new contact list. Maximum{" "}
            <strong>{MAX_CONTACTS} contacts</strong> per list.
          </DialogDescription>
        </DialogHeader>

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
            <Label>List Name *</Label>
            <Input
              placeholder="e.g., Newsletter Subscribers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* 100-contact cap notice */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>100 contact maximum per list.</strong> This ensures
              reliable delivery within API and infrastructure limits. If you
              have more, split into multiple lists.
            </AlertDescription>
          </Alert>

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

              {/* Valid preview */}
              {validEmails.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-green-700">
                      Valid ({validEmails.length})
                    </Label>
                    {validEmails.length > MAX_CONTACTS && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">
                        Only first {MAX_CONTACTS} will be used
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex flex-wrap gap-1">
                      {validEmails.slice(0, 20).map((email, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
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

              {/* Invalid */}
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
              {/* Drop zone */}
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
                      <code className="bg-gray-100 px-1 rounded">company</code>,{" "}
                      <code className="bg-gray-100 px-1 rounded">phone</code>
                    </p>
                  </div>
                )}
              </div>

              {/* CSV errors */}
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

              {/* CSV preview */}
              {csvContacts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {csvContacts.length} contact
                      {csvContacts.length !== 1 ? "s" : ""} found
                    </Label>
                    {csvContacts.length > MAX_CONTACTS && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">
                        Only first {MAX_CONTACTS} will be imported
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
                        {csvContacts.slice(0, MAX_CONTACTS).map((c, i) => (
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
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Count indicator */}
          {contactCount > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {Math.min(contactCount, MAX_CONTACTS)} of {MAX_CONTACTS} max
                  contacts
                </span>
                {isOverLimit && (
                  <span className="text-amber-600 font-medium">
                    {contactCount - MAX_CONTACTS} will be excluded
                  </span>
                )}
              </div>
              <Progress
                value={Math.min((contactCount / MAX_CONTACTS) * 100, 100)}
                className={`h-1.5 ${isOverLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-500"}`}
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create List ({Math.min(contactCount, MAX_CONTACTS)} contacts)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
