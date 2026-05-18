"use client";

// ─── DROP-IN REPLACEMENT for the EmailDetailDialog component only ─────────────
// The rest of email-history-list.tsx (EmailHistoryList, helpers, etc.) is unchanged.
// Add the buildEmailPreviewHtml function at the top of your file,
// then replace the full EmailDetailDialog with this version.

// ── Step 1: Add this helper near the top of email-history-list.tsx ────────────

function buildEmailPreviewHtml(body: string, senderName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{padding:24px 12px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08)}
    .body-content{padding:36px 44px;color:#374151;font-size:15px;line-height:1.7}
    .footer{padding:16px 44px;border-top:1px solid #e5e7eb;text-align:center}
    .footer p{font-size:12px;color:#9ca3af}
    .footer a{color:#6b7280;text-decoration:underline}
    .body-content h1{font-size:26px;font-weight:700;margin-bottom:14px;color:#111827;line-height:1.25}
    .body-content h2{font-size:20px;font-weight:600;margin-bottom:12px;color:#111827}
    .body-content h3{font-size:17px;font-weight:600;margin-bottom:10px;color:#111827}
    .body-content p{margin-bottom:14px}
    .body-content ul,.body-content ol{margin-bottom:14px;padding-left:22px}
    .body-content li{margin-bottom:5px}
    .body-content a{color:#2563eb;text-decoration:underline}
    .body-content strong{font-weight:700}
    .body-content em{font-style:italic}
    .body-content u{text-decoration:underline}
    .body-content s{text-decoration:line-through}
    .body-content blockquote{padding:10px 14px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;margin-bottom:14px}
    .body-content img{max-width:100%;border-radius:6px;height:auto}
    .body-content hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
    .body-content table{width:100%;border-collapse:collapse;margin-bottom:14px}
    .body-content td,.body-content th{padding:9px 11px;border:1px solid #e5e7eb;text-align:left}
    .body-content th{background:#f9fafb;font-weight:600}
    .body-content code{background:#f3f4f6;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:13px}
    .body-content pre{background:#1e1e2e;color:#cdd6f4;padding:14px;border-radius:7px;overflow-x:auto;margin-bottom:14px}
    .body-content pre code{background:transparent;color:inherit;padding:0}
    @media(max-width:600px){.body-content{padding:20px 16px!important}.footer{padding:14px 16px!important}}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="body-content">${body || '<p style="color:#9ca3af;">No content</p>'}</div>
      <div class="footer">
        <p>Sent by <strong>${senderName}</strong> · <a href="#">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Step 2: Replace your EmailDetailDialog with this full version ─────────────
// (Keep all other imports; add Monitor + Smartphone if not already imported)

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { Monitor, Smartphone } from "lucide-react";

interface EmailHistoryItem {
  id: string;
  subject: string;
  body: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  failedCount: number;
  bouncedCount: number;
  complainedCount?: number;
  unsubscribedCount?: number;
  status?: string;
  senderName?: string;
  senderEmail?: string;
  preheader?: string;
  createdAt: Date;
  contactList: {
    name: string;
    domain: { domain: string };
    _count: { emailHistory: number };
  };
}

export function EmailDetailDialog({
  email,
  open,
  onClose,
}: {
  email: EmailHistoryItem;
  open: boolean;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const deliveryRate =
    email.sentCount > 0
      ? Math.round((email.deliveredCount / email.sentCount) * 100)
      : 0;
  const openRate =
    email.deliveredCount > 0
      ? Math.round((email.openedCount / email.deliveredCount) * 100)
      : 0;
  const clickRate =
    email.deliveredCount > 0
      ? Math.round((email.clickedCount / email.deliveredCount) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <DialogTitle className="text-base font-semibold text-gray-900 pr-8 truncate">
            {email.subject}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-0.5">
            Campaign sent{" "}
            {new Date(email.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* ── Overview ────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-0.5">Contact List</p>
                  <p className="font-medium text-gray-900">
                    {email.contactList.name}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-0.5">Domain</p>
                  <p className="font-medium text-gray-900">
                    {email.contactList.domain.domain}
                  </p>
                </div>
                {email.senderName && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Sender</p>
                    <p className="font-medium text-gray-900">
                      {email.senderName}
                    </p>
                    <p className="text-xs text-gray-500">{email.senderEmail}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {email.status || "Sent"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  {
                    label: "Sent",
                    value: email.sentCount,
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                  },
                  {
                    label: "Delivered",
                    value: email.deliveredCount,
                    bg: "bg-green-50",
                    text: "text-green-700",
                  },
                  {
                    label: "Opened",
                    value: email.openedCount,
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                  },
                  {
                    label: "Clicked",
                    value: email.clickedCount,
                    bg: "bg-indigo-50",
                    text: "text-indigo-700",
                  },
                  {
                    label: "Failed",
                    value: email.failedCount,
                    bg: "bg-red-50",
                    text: "text-red-700",
                  },
                  {
                    label: "Bounced",
                    value: email.bouncedCount,
                    bg: "bg-orange-50",
                    text: "text-orange-700",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`${m.bg} rounded-xl p-3 text-center`}
                  >
                    <p className={`text-xl font-bold ${m.text}`}>{m.value}</p>
                    <p className={`text-xs ${m.text} mt-0.5 font-medium`}>
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>

              {email.sentCount > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Delivery Rate",
                      value: `${deliveryRate}%`,
                      color: "text-green-700",
                    },
                    {
                      label: "Open Rate",
                      value: `${openRate}%`,
                      color: "text-purple-700",
                    },
                    {
                      label: "Click Rate",
                      value: `${clickRate}%`,
                      color: "text-indigo-700",
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="text-center p-3 border border-gray-200 rounded-xl"
                    >
                      <p className={`text-2xl font-bold ${r.color}`}>
                        {r.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Preview (iframe) ─────────────────────────────────────── */}
            <TabsContent value="preview" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Accurate inbox preview of sent email
                </p>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode("desktop")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "desktop"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Monitor className="h-3 w-3" /> Desktop
                  </button>
                  <button
                    onClick={() => setViewMode("mobile")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "mobile"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Smartphone className="h-3 w-3" /> Mobile
                  </button>
                </div>
              </div>

              {/* Inbox chrome */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(email.senderName || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {email.senderName || "Sender"}
                        </p>
                        {email.senderEmail && (
                          <p className="text-xs text-gray-400">
                            &lt;{email.senderEmail}&gt;
                          </p>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 mt-0.5 truncate">
                        {email.subject}
                      </p>
                      {email.preheader && (
                        <p className="text-xs text-gray-400 truncate">
                          {email.preheader}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* iframe renders HTML accurately */}
                <div className="bg-gray-100 p-3 flex justify-center overflow-auto">
                  <div
                    className="bg-white shadow rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      width: viewMode === "mobile" ? "375px" : "100%",
                      maxWidth: viewMode === "mobile" ? "375px" : "680px",
                    }}
                  >
                    <iframe
                      srcDoc={buildEmailPreviewHtml(
                        email.body,
                        email.senderName || "Sender",
                      )}
                      title="Email preview"
                      className="w-full border-0"
                      style={{ height: "500px" }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Analytics ────────────────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-5">
              <div className="space-y-3">
                {[
                  {
                    label: "Delivery Rate",
                    value: `${deliveryRate}%`,
                    detail: `${email.deliveredCount} of ${email.sentCount} delivered`,
                    good: deliveryRate > 95,
                  },
                  {
                    label: "Open Rate",
                    value: `${openRate}%`,
                    detail: `${email.openedCount} opens`,
                    good: openRate > 20,
                  },
                  {
                    label: "Click Rate",
                    value: `${clickRate}%`,
                    detail: `${email.clickedCount} clicks`,
                    good: clickRate > 2,
                  },
                  {
                    label: "Complaint Rate",
                    value:
                      email.sentCount > 0
                        ? `${(((email.complainedCount || 0) / email.sentCount) * 100).toFixed(3)}%`
                        : "—",
                    detail: `${email.complainedCount || 0} spam complaints`,
                    good: (email.complainedCount || 0) === 0,
                  },
                  {
                    label: "Unsubscribes",
                    value: String(email.unsubscribedCount || 0),
                    detail: "removed from list",
                    good: (email.unsubscribedCount || 0) === 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400">{item.detail}</p>
                    </div>
                    <span
                      className={`text-lg font-bold ${item.good ? "text-green-600" : "text-amber-600"}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center">
                This list has been used in{" "}
                {email.contactList._count.emailHistory} total campaign
                {email.contactList._count.emailHistory !== 1 ? "s" : ""}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
