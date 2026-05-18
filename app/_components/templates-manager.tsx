"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Search,
  FileText,
  Sparkles,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  X,
  Monitor,
  Smartphone,
  Mail,
} from "lucide-react";
import RichTextEditor from "@/app/_components/rich-text-editor";
import { BUILTIN_TEMPLATES } from "../_lib/email/templates";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  name: string;
  description?: string | null;
  subject?: string | null;
  body: string;
  category: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "custom", label: "Custom" },
  { value: "newsletter", label: "Newsletter" },
  { value: "promo", label: "Promotional" },
  { value: "welcome", label: "Welcome" },
  { value: "announcement", label: "Announcement" },
  { value: "transactional", label: "Transactional" },
];

const CATEGORY_COLORS: Record<string, string> = {
  custom: "bg-gray-100 text-gray-700 border-gray-200",
  newsletter: "bg-blue-100 text-blue-700 border-blue-200",
  promo: "bg-orange-100 text-orange-700 border-orange-200",
  welcome: "bg-green-100 text-green-700 border-green-200",
  announcement: "bg-purple-100 text-purple-700 border-purple-200",
  transactional: "bg-teal-100 text-teal-700 border-teal-200",
};

// ── Email Preview HTML Generator ──────────────────────────────────────────────

function buildPreviewHtml(body: string, senderName = "Your Brand") {
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
    .body-content u{text-decoration:underline}
    .body-content s{text-decoration:line-through}
    .body-content blockquote{padding:12px 16px;border-left:4px solid #e5e7eb;color:#6b7280;margin-bottom:16px;font-style:italic}
    .body-content img{max-width:100%;border-radius:6px;height:auto}
    .body-content hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
    .body-content table{width:100%;border-collapse:collapse;margin-bottom:16px}
    .body-content td,.body-content th{padding:10px 12px;border:1px solid #e5e7eb;text-align:left}
    .body-content th{background:#f9fafb;font-weight:600}
    .body-content code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
    .body-content pre{background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow-x:auto;margin-bottom:16px}
    .body-content pre code{background:transparent;color:inherit;padding:0}
    @media(max-width:600px){.body-content{padding:24px 20px!important}.footer{padding:16px 20px!important}}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="body-content">${body || '<p style="color:#9ca3af;">Your email content will appear here...</p>'}</div>
      <div class="footer">
        <p>Sent by <strong>${senderName}</strong> · <a href="#">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white rounded-t-xl">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold text-gray-900 truncate pr-4">
              {template.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Template preview
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "desktop"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "mobile"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
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
        <div className="px-5 py-3 bg-white border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              Y
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900">
                  Your Brand
                </span>
                <span className="text-xs text-gray-400">
                  &lt;noreply@yourdomain.com&gt;
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">
                {template.subject || "(No subject set)"}
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">Just now</span>
          </div>
        </div>

        {/* Email iframe */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
          <div
            className="bg-white shadow-lg rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              width: viewMode === "mobile" ? "390px" : "100%",
              maxWidth: viewMode === "mobile" ? "390px" : "720px",
            }}
          >
            <iframe
              srcDoc={buildPreviewHtml(template.body)}
              title="Email preview"
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create / Edit Template Modal ──────────────────────────────────────────────

function TemplateFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: EmailTemplate | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("custom");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Reset form when opening/changing template
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setSubject(editing?.subject ?? "");
      setCategory(editing?.category ?? "custom");
      setBody(editing?.body ?? "");
      setError("");
      setPreviewMode(false);
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!body.trim() || body === "<p></p>") {
      setError("Template body cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, subject, category, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[94vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl shrink-0">
          <div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {editing ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              {editing
                ? "Update your saved template"
                : "Build a reusable email template"}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="text-xs"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {previewMode ? (
            /* Preview pane */
            <div className="h-full bg-gray-100 p-6 flex justify-center">
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden w-full max-w-2xl">
                <div className="bg-gray-50 border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      Y
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Your Brand</p>
                      <p className="text-xs text-gray-500">
                        {subject || "(No subject)"}
                      </p>
                    </div>
                  </div>
                </div>
                <iframe
                  srcDoc={buildPreviewHtml(body)}
                  title="Template preview"
                  className="w-full border-0"
                  style={{ height: "500px" }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            /* Edit form */
            <div className="p-6 space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Monthly Newsletter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={setCategory}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Default Subject Line{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (optional)
                  </span>
                </Label>
                <Input
                  placeholder="e.g., Your Monthly Update from {company}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Description{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  placeholder="Brief description of what this template is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email Body *</Label>
                <RichTextEditor
                  content={body}
                  onChange={setBody}
                  placeholder="Design your email template here..."
                  minHeight={380}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            Use{" "}
            <code className="bg-gray-100 px-1 rounded text-blue-600">
              {"{first_name}"}
            </code>
            ,{" "}
            <code className="bg-gray-100 px-1 rounded text-blue-600">
              {"{email}"}
            </code>{" "}
            etc. as dynamic variables
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editing ? "Update Template" : "Save Template"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Built-in template picker ──────────────────────────────────────────────────

function BuiltinTemplatePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: {
    name: string;
    subject: string;
    body: string;
    category: string;
  }) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const filtered =
    activeCategory === "all"
      ? BUILTIN_TEMPLATES
      : BUILTIN_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <DialogTitle>Start from a Built-in Template</DialogTitle>
          <DialogDescription>
            Pick one to pre-fill the editor. You can edit everything after.
          </DialogDescription>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 px-6 py-3 border-b border-gray-100 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === c.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700">
                    {template.name}
                  </span>
                  <Badge
                    className={`text-xs border ml-2 shrink-0 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
                  >
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: EmailTemplate;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200">
      {/* Mini email preview */}
      <div
        className="h-36 bg-gray-50 border-b border-gray-100 overflow-hidden relative cursor-pointer"
        onClick={onPreview}
      >
        <iframe
          srcDoc={buildPreviewHtml(template.body)}
          title={template.name}
          className="w-full border-0 pointer-events-none"
          style={{
            height: "500px",
            transform: "scale(0.3)",
            transformOrigin: "top left",
            width: "333%",
          }}
          sandbox="allow-same-origin"
        />
        {/* Overlay with eye icon on hover */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center transition-all">
          <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2 shadow-lg transition-all">
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        {template.isBuiltIn && (
          <div className="absolute top-2 left-2">
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">
              <Sparkles className="h-2.5 w-2.5 mr-1" /> Built-in
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm text-gray-900 truncate">
            {template.name}
          </h3>
          <Badge
            className={`text-xs border shrink-0 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
          >
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {template.description}
          </p>
        )}
        {template.subject && (
          <p className="text-xs text-gray-400 truncate mb-3 flex items-center gap-1">
            <Mail className="h-3 w-3" /> {template.subject}
          </p>
        )}
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
          <Calendar className="h-3 w-3" />
          {new Date(template.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className="h-7 text-xs flex-1"
          >
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDuplicate}
            className="h-7 text-xs flex-1"
          >
            <Copy className="h-3 w-3 mr-1" /> Duplicate
          </Button>
          {!template.isBuiltIn && (
            <>
              <button
                onClick={onEdit}
                className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${template.name}"?`)) return;
                  setDeleting(true);
                  onDelete();
                }}
                disabled={deleting}
                className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Templates Manager ────────────────────────────────────────────────────

export function TemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [builtinOpen, setBuiltinOpen] = useState(false);

  // Prefill for creating from builtin
  const [prefill, setPrefill] = useState<{
    name: string;
    subject: string;
    body: string;
    category: string;
  } | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (res.ok) setTemplates(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          subject: template.subject,
          body: template.body,
          category: template.category,
        }),
      });
      if (res.ok) fetchTemplates();
    } catch {}
  };

  const handleSelectBuiltin = (t: {
    name: string;
    subject: string;
    body: string;
    category: string;
  }) => {
    setPrefill(t);
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setPrefill(null);
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleCreateNew = () => {
    setPrefill(null);
    setEditingTemplate(null);
    setFormOpen(true);
  };

  // Apply prefill when form opens with builtin
  const formInitial = editingTemplate
    ? editingTemplate
    : prefill
      ? ({
          id: "",
          name: prefill.name,
          subject: prefill.subject,
          body: prefill.body,
          category: prefill.category,
          description: "",
          isBuiltIn: false,
          createdAt: "",
          updatedAt: "",
        } as EmailTemplate)
      : null;

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-sm"
            />
          </div>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBuiltinOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Start from Template
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === c.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.label}
            {c.value !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({templates.filter((t) => t.category === c.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="h-36 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-7 bg-gray-100 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <LayoutTemplate className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-base font-semibold text-gray-700">
            {search || activeCategory !== "all"
              ? "No templates match your filters"
              : "No templates yet"}
          </h3>
          <p className="text-sm text-gray-400 mt-1 mb-6">
            {search || activeCategory !== "all"
              ? "Try clearing your search or filter"
              : "Create your first template or start from a built-in one"}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setBuiltinOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Start from Template
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={() => setPreviewTemplate(template)}
              onEdit={() => handleEdit(template)}
              onDelete={() => handleDelete(template.id)}
              onDuplicate={() => handleDuplicate(template)}
            />
          ))}
        </div>
      )}

      {/* Stats bar */}
      {templates.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {filtered.length} template{filtered.length !== 1 ? "s" : ""} shown
          {templates.length !== filtered.length
            ? ` of ${templates.length} total`
            : ""}
        </p>
      )}

      {/* Modals */}
      <PreviewModal
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />

      <TemplateFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTemplate(null);
          setPrefill(null);
        }}
        onSaved={fetchTemplates}
        editing={formInitial}
      />

      <BuiltinTemplatePicker
        open={builtinOpen}
        onClose={() => setBuiltinOpen(false)}
        onSelect={handleSelectBuiltin}
      />
    </div>
  );
}
