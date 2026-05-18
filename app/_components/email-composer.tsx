"use client";


import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Badge } from "@/app/_components/ui/badge";
import RichTextEditor from "./rich-text-editor";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import {
  AlertCircle,
  Send,
  Eye,
  Users,
  Globe,
  Smartphone,
  Monitor,
  LayoutTemplate,
  X,
  CheckCircle,
  Sparkles,
  Wand2,
  Type,
  Braces,
  ChevronRight,
  Copy,
  Mail,
} from "lucide-react";
import { BUILTIN_TEMPLATES } from "../_lib/email/templates";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ContactList {
  id: string;
  name: string;
  emails: string[];
  createdAt: Date;
  domain: { id: string; domain: string };
  _count?: { contacts: number };
}

interface Sender {
  id: string;
  name: string;
  email: string;
  domain: { id: string; domain: string; status: string };
}

interface SavedTemplate {
  id: string;
  name: string;
  description?: string | null;
  subject?: string | null;
  body: string;
  designJson?: string | null;
  category: string;
}

interface EmailComposerProps {
  contactLists: ContactList[];
  senders: Sender[];
}

const VARIABLES = [
  { label: "First Name", token: "{first_name}" },
  { label: "Last Name", token: "{last_name}" },
  { label: "Full Name", token: "{full_name}" },
  { label: "Email", token: "{email}" },
  { label: "Company", token: "{company}" },
];

const CATEGORY_COLORS: Record<string, string> = {
  custom: "bg-gray-100 text-gray-700",
  newsletter: "bg-blue-100 text-blue-700",
  promo: "bg-orange-100 text-orange-700",
  welcome: "bg-green-100 text-green-700",
  announcement: "bg-purple-100 text-purple-700",
  transactional: "bg-teal-100 text-teal-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML preview wrapper (for plain Tiptap HTML)
// ─────────────────────────────────────────────────────────────────────────────

function buildPreviewHtml(
  body: string,
  senderName: string,
  preheader?: string,
) {
  // Visual builder templates already contain full HTML
  if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html")) {
    return body;
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{padding:32px 16px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.1)}
    .body-content{padding:40px 48px;color:#374151;font-size:15px;line-height:1.7}
    .footer{padding:20px 48px;border-top:1px solid #e5e7eb;text-align:center}
    .footer p{font-size:12px;color:#9ca3af}
    .footer a{color:#6b7280;text-decoration:underline}
    .body-content h1{font-size:28px;font-weight:700;margin-bottom:16px;color:#111827;line-height:1.25}
    .body-content h2{font-size:22px;font-weight:600;margin-bottom:14px;color:#111827;line-height:1.3}
    .body-content h3{font-size:18px;font-weight:600;margin-bottom:12px;color:#111827}
    .body-content p{margin-bottom:16px}
    .body-content ul,.body-content ol{margin-bottom:16px;padding-left:24px}
    .body-content li{margin-bottom:6px}
    .body-content a{color:#2563eb;text-decoration:underline}
    .body-content strong{font-weight:700}
    .body-content em{font-style:italic}
    .body-content blockquote{padding:12px 16px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;margin-bottom:16px}
    .body-content img{max-width:100%;border-radius:6px;height:auto}
    .body-content hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
    .body-content table{width:100%;border-collapse:collapse;margin-bottom:16px}
    .body-content td,.body-content th{padding:10px 12px;border:1px solid #e5e7eb;text-align:left}
    .body-content th{background:#f9fafb;font-weight:600}
    .body-content code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
    @media(max-width:600px){.body-content{padding:24px 20px!important}.footer{padding:16px 20px!important}}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="body-content">${body || '<p style="color:#9ca3af;">Your email content will appear here...</p>'}</div>
      <div class="footer">
        <p>Sent by <strong>${senderName || "Your Brand"}</strong> · <a href="#">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Preview Modal
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  subject,
  body,
  senderName,
  senderEmail,
  preheader,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  preheader?: string;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white rounded-t-xl shrink-0">
          <div>
            <DialogTitle className="text-sm font-semibold text-gray-900">
              Email Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Accurate rendering — exactly what recipients will see
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "desktop" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "mobile" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inbox chrome */}
        <div className="px-5 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {senderName?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900">
                  {senderName || "Sender"}
                </span>
                <span className="text-xs text-gray-400">
                  &lt;{senderEmail}&gt;
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">
                {subject || "(No subject)"}
              </p>
              {preheader && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {preheader}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">Just now</span>
          </div>
        </div>

        {/* Iframe preview */}
        <div className="flex-1 overflow-auto bg-gray-200 p-6 flex justify-center">
          {viewMode === "mobile" ? (
            <div
              className="relative bg-gray-900 rounded-[2.5rem] p-3 pb-4 shadow-2xl"
              style={{ width: 410 }}
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
              <div className="bg-white rounded-[2rem] overflow-hidden mt-3">
                <iframe
                  srcDoc={buildPreviewHtml(body, senderName, preheader)}
                  title="Mobile preview"
                  className="w-full border-0 block"
                  style={{ height: 640 }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${c}`}
                      />
                    ),
                  )}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-0.5 text-xs text-gray-400">
                  Campaign Preview
                </div>
              </div>
              <iframe
                srcDoc={buildPreviewHtml(body, senderName, preheader)}
                title="Desktop preview"
                className="w-full border-0 block"
                style={{ height: 680 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Picker (enhanced — shows visual badge, mini preview)
// ─────────────────────────────────────────────────────────────────────────────

function TemplatePicker({
  onSelect,
}: {
  onSelect: (t: {
    name?: string;
    subject?: string;
    body: string;
    isVisual: boolean;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<"saved" | "builtin">("saved");
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadSaved = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
        if (data.length === 0) setActiveTab("builtin");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadSaved();
  }, [open]);

  const handleSelect = (t: {
    name?: string;
    subject?: string | null;
    body: string;
    designJson?: string | null;
  }) => {
    onSelect({
      name: t.name,
      subject: t.subject ?? undefined,
      body: t.body,
      isVisual: !!t.designJson,
    });
    setOpen(false);
  };

  const templates =
    activeTab === "saved"
      ? savedTemplates
      : BUILTIN_TEMPLATES.map((t) => ({ ...t, designJson: null }));
  const filtered = search
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(search.toLowerCase()),
      )
    : templates;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
      >
        <LayoutTemplate className="mr-1.5 h-4 w-4" /> Use Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[82vh] flex flex-col p-0 gap-0">
          <div className="px-6 py-4 border-b border-gray-200 shrink-0">
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a template to pre-fill your email body. You can edit
              content after selecting.
            </DialogDescription>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 shrink-0">
            {[
              {
                key: "saved",
                label: `My Templates (${savedTemplates.length})`,
              },
              {
                key: "builtin",
                label: `Built-in (${BUILTIN_TEMPLATES.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : activeTab === "saved" && savedTemplates.length === 0 ? (
              <div className="text-center py-12">
                <LayoutTemplate className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  No saved templates yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Create templates on the Templates page, or switch to Built-in.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab("builtin")}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Browse Built-in
                  Templates
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 truncate pr-2">
                        {template.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {"designJson" in template && template.designJson && (
                          <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                            <Wand2 className="h-2 w-2" /> Visual
                          </span>
                        )}
                        <Badge
                          className={`text-[10px] shrink-0 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
                        >
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    {template.subject && (
                      <p className="text-xs text-gray-400 mt-1.5 truncate">
                        Subject: {template.subject}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Use this template <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Body Preview (inline, read-only, shown when template body is visual HTML)
// ─────────────────────────────────────────────────────────────────────────────

function VisualBodyPreview({
  html,
  onClear,
}: {
  html: string;
  onClear: () => void;
}) {
  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700">
            Visual template loaded
          </span>
          <span className="text-xs text-blue-500">
            — full HTML email. Use "Use Template" to change.
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
      {/* Scaled preview */}
      <div
        className="relative overflow-hidden bg-gray-50"
        style={{ height: 280 }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: "scale(0.5) translateX(-50%) translateY(-50%)",
            transformOrigin: "top left",
            width: "200%",
            top: "50%",
            left: "50%",
          }}
        >
          <iframe
            srcDoc={html}
            title="Email body preview"
            className="w-full border-0 block"
            style={{ height: 560 }}
            sandbox="allow-same-origin"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable Quick-Insert Strip
// ─────────────────────────────────────────────────────────────────────────────

function VariableStrip({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
        <Braces className="h-3 w-3" /> Variables:
      </span>
      {VARIABLES.map((v) => (
        <button
          key={v.token}
          type="button"
          onClick={() => onInsert(v.token)}
          className="text-xs px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md font-mono transition-colors"
          title={`Insert ${v.label}`}
        >
          {v.token}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Composer
// ─────────────────────────────────────────────────────────────────────────────

export function EmailComposer({ contactLists, senders }: EmailComposerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preheader, setPreheader] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedSenderId, setSelectedSenderId] = useState("");
  const [filteredSenders, setFilteredSenders] = useState<Sender[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bodyIsVisual, setBodyIsVisual] = useState(false); // true when body is full visual HTML

  // Body editor mode
  const [editorMode, setEditorMode] = useState<"text" | "visual-preview">(
    "text",
  );
  // "text" = Tiptap, "visual-preview" = loaded visual template (read-only inline iframe + can switch back)

  const selectedList = contactLists.find((l) => l.id === selectedListId);
  const selectedSender = filteredSenders.find((s) => s.id === selectedSenderId);

  // Pre-select list from URL param
  useEffect(() => {
    const preselectedListId = searchParams.get("listId");
    if (preselectedListId) setSelectedListId(preselectedListId);
  }, [searchParams]);

  // Filter senders by domain of selected list
  useEffect(() => {
    if (selectedList) {
      const sendersForDomain = senders.filter(
        (s) => s.domain.id === selectedList.domain.id,
      );
      setFilteredSenders(sendersForDomain);
      if (
        selectedSenderId &&
        !sendersForDomain.some((s) => s.id === selectedSenderId)
      ) {
        setSelectedSenderId("");
      }
      if (sendersForDomain.length === 1)
        setSelectedSenderId(sendersForDomain[0].id);
    } else {
      setFilteredSenders([]);
      setSelectedSenderId("");
    }
  }, [selectedListId, selectedList, senders]);

  const getRecipientCount = (list: ContactList) =>
    list._count?.contacts ?? list.emails.length;

  // ── Submit (unchanged logic) ─────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationResult = emailComposeSchema.safeParse({
      subject: subject.trim(),
      body: body.trim(),
      contactListId: selectedListId,
      senderId: selectedSenderId,
      preheader: preheader.trim() || undefined,
    });

    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send email");

      setSuccess(
        `Campaign sent to ${result.sentCount} recipient${result.sentCount !== 1 ? "s" : ""}!`,
      );
      setSubject("");
      setBody("");
      setPreheader("");
      setSelectedListId("");
      setSelectedSenderId("");
      setBodyIsVisual(false);
      setEditorMode("text");
      setTimeout(() => router.push("/email-history"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Template select ──────────────────────────────────────────────────────

  const handleTemplateSelect = (t: {
    name?: string;
    subject?: string;
    body: string;
    isVisual: boolean;
  }) => {
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
    setBodyIsVisual(t.isVisual);
    setEditorMode(t.isVisual ? "visual-preview" : "text");
  };

  // ── Variable insert into subject or body ─────────────────────────────────

  const insertVariableIntoSubject = (token: string) => {
    setSubject((prev) => prev + token);
  };

  const canSend = subject && body && selectedListId && selectedSenderId;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Composer ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Compose Email</CardTitle>
                  <CardDescription>
                    Create and send your email campaign
                  </CardDescription>
                </div>
                <TemplatePicker onSelect={handleTemplateSelect} />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Contact List */}
                <div className="space-y-2">
                  <Label>Contact List *</Label>
                  <Select
                    value={selectedListId}
                    onValueChange={setSelectedListId}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact list" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          <div className="flex items-center gap-2">
                            <span>{list.name}</span>
                            <span className="text-gray-400 text-xs">
                              ({getRecipientCount(list)} recipients)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedList && (
                    <p className="text-xs text-gray-500">
                      Domain: <strong>{selectedList.domain.domain}</strong> ·{" "}
                      {getRecipientCount(selectedList)} recipient
                      {getRecipientCount(selectedList) !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Sender */}
                <div className="space-y-2">
                  <Label>From (Sender) *</Label>
                  <Select
                    value={selectedSenderId}
                    onValueChange={setSelectedSenderId}
                    disabled={
                      isLoading ||
                      !selectedListId ||
                      filteredSenders.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedListId
                            ? "Select a contact list first"
                            : filteredSenders.length === 0
                              ? "No senders for this domain"
                              : "Choose sender"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSenders.map((sender) => (
                        <SelectItem key={sender.id} value={sender.id}>
                          <div className="flex items-center gap-2">
                            <span>{sender.name}</span>
                            <span className="text-gray-400 text-xs">
                              &lt;{sender.email}&gt;
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedList && filteredSenders.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No senders for{" "}
                        <strong>{selectedList.domain.domain}</strong>.{" "}
                        <a
                          href="/domains"
                          className="text-blue-600 hover:underline"
                        >
                          Add a sender →
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label>Subject Line *</Label>
                  <Input
                    placeholder="Enter your email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={isLoading}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    <VariableStrip onInsert={insertVariableIntoSubject} />
                    <span className="text-xs text-gray-400 shrink-0">
                      {subject.length}/200
                    </span>
                  </div>
                </div>

                {/* Preheader */}
                <div className="space-y-2">
                  <Label>
                    Preheader{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    placeholder="Short preview text shown below subject in inbox..."
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    disabled={isLoading}
                    maxLength={150}
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label>Email Content *</Label>

                    {/* Editor mode toggle */}
                    {bodyIsVisual && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                          <Wand2 className="h-2.5 w-2.5" /> Visual template
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBody("");
                            setBodyIsVisual(false);
                            setEditorMode("text");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <Type className="h-3 w-3" /> Switch to plain text
                        </button>
                      </div>
                    )}
                    {!bodyIsVisual && body && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Type className="h-3 w-3" /> Rich text
                      </span>
                    )}
                  </div>

                  {editorMode === "visual-preview" && bodyIsVisual ? (
                    <VisualBodyPreview
                      html={body}
                      onClear={() => {
                        setBody("");
                        setBodyIsVisual(false);
                        setEditorMode("text");
                      }}
                    />
                  ) : (
                    <RichTextEditor
                      content={body}
                      onChange={setBody}
                      placeholder="Write your email content here..."
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={!body}
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !canSend}
                    className="min-w-[140px]"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Send Campaign
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Sidebar (campaign details) ──────────────────────────── */}
        <div className="space-y-6">
          {/* Variables reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Braces className="h-4 w-4 text-blue-600" /> Dynamic Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {VARIABLES.map((v) => (
                <div
                  key={v.token}
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-gray-600">{v.label}</span>
                  <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {v.token}
                  </code>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                Replaced with each contact's data at send time.
              </p>
            </CardContent>
          </Card>

          {selectedList && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Domain</p>
                    <p className="text-sm font-medium">
                      {selectedList.domain.domain}
                    </p>
                  </div>
                </div>
                {selectedSender && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <p className="font-medium text-sm">{selectedSender.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedSender.email}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedList && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedList.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created{" "}
                    {new Date(selectedList.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {getRecipientCount(selectedList)} recipient
                    {getRecipientCount(selectedList) !== 1 ? "s" : ""}
                  </span>
                </div>
                {selectedList.emails.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Sample:</Label>
                    {selectedList.emails.slice(0, 3).map((email, i) => (
                      <p
                        key={i}
                        className="text-xs text-gray-500 truncate font-mono"
                      >
                        {email}
                      </p>
                    ))}
                    {selectedList.emails.length > 3 && (
                      <p className="text-xs text-gray-400">
                        +{selectedList.emails.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        subject={subject}
        body={body}
        senderName={selectedSender?.name || "Your Brand"}
        senderEmail={selectedSender?.email || "noreply@yourdomain.com"}
        preheader={preheader}
      />
    </>
  );
}
