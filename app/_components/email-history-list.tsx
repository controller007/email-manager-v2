"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import {
  Mail,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3,
  Trash2,
  Trash,
  Globe,
  Send,
  Eye,
  XCircle,
  MousePointer,
  Smartphone,
  Monitor,
  X,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteEmailHistory,
  deleteManyEmailHistories,
  clearAllEmailHistories,
} from "@/app/email-history/actions";
import { toast } from "sonner";
import { Badge } from "@/app/_components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface EmailHistoryListProps {
  emailHistory: EmailHistoryItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function EmailDetailDialog({
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

            {/* Overview tab */}
            <TabsContent value="overview" className="space-y-5">
              {/* Meta */}
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
                  <p className="text-xs text-gray-500 mb-0.5">Method</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {email.status || "Sent"}
                  </p>
                </div>
              </div>

              {/* Metrics grid */}
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

              {/* Rates */}
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

            {/* Preview tab */}
            <TabsContent value="preview" className="space-y-3">
              {/* Mobile/desktop toggle */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Inbox preview of the sent email
                </p>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode("desktop")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "desktop"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </button>
                  <button
                    onClick={() => setViewMode("mobile")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "mobile"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Inbox chrome */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <div className="px-4 py-3 bg-white border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(email.senderName || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {email.senderName || "Sender"}
                      </p>
                      <p className="text-xs font-medium text-gray-700 mt-0.5 truncate">
                        {email.subject}
                      </p>
                      {email.preheader && (
                        <p className="text-xs text-gray-400 truncate">
                          {email.preheader}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 overflow-auto">
                  <div
                    className={`mx-auto bg-white rounded-lg overflow-hidden shadow-sm transition-all ${
                      viewMode === "mobile" ? "max-w-xs" : "max-w-full"
                    }`}
                  >
                    <div
                      className="prose prose-sm max-w-none p-5"
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                    <div className="border-t border-gray-100 px-5 py-3 text-center">
                      <p className="text-xs text-gray-400">
                        You're receiving this email because you subscribed.{" "}
                        <span className="underline">Unsubscribe</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Analytics tab */}
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
                      className={`text-lg font-bold ${
                        item.good ? "text-green-600" : "text-amber-600"
                      }`}
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

// ── Main List Component ───────────────────────────────────────────────────────

export function EmailHistoryList({
  emailHistory,
  totalCount,
  currentPage,
  totalPages,
}: EmailHistoryListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) newSelected.add(itemId);
    else {
      newSelected.delete(itemId);
      setIsSelectAll(false);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(emailHistory.map((item) => item.id)));
      setIsSelectAll(true);
    } else {
      setSelectedItems(new Set());
      setIsSelectAll(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    startTransition(async () => {
      try {
        await deleteManyEmailHistories(Array.from(selectedItems));
        setSelectedItems(new Set());
        setIsSelectAll(false);
        toast("Success", {
          description: (
            <span className="!text-green-600">
              Deleted {selectedItems.size} email(s) successfully.
            </span>
          ),
        });
        router.refresh();
      } catch {
        toast("Error", {
          description: (
            <span className="!text-red-500">
              Failed to delete selected emails.
            </span>
          ),
        });
      }
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      try {
        await clearAllEmailHistories();
        setSelectedItems(new Set());
        setIsSelectAll(false);
        toast("Success", {
          description: (
            <span className="!text-green-600">All email history cleared.</span>
          ),
        });
        router.refresh();
      } catch {
        toast("Error", {
          description: (
            <span className="!text-red-500">Failed to clear history.</span>
          ),
        });
      }
    });
  };

  const handleSingleDelete = (itemId: string) => {
    startTransition(async () => {
      try {
        await deleteEmailHistory(itemId);
        toast("Success", {
          description: <span className="!text-green-600">Email deleted.</span>,
        });
        router.refresh();
      } catch {
        toast("Error", {
          description: <span className="!text-red-500">Failed to delete.</span>,
        });
      }
    });
  };

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/email-history?${params.toString()}`);
  };

  const getOverallStatus = (email: EmailHistoryItem) => {
    if (email.failedCount > 0 && email.deliveredCount === 0)
      return {
        label: "Failed",
        color: "bg-red-100 text-red-700 border-red-200",
        Icon: XCircle,
      };
    if (email.deliveredCount > 0 && email.failedCount === 0)
      return {
        label: "Delivered",
        color: "bg-green-100 text-green-700 border-green-200",
        Icon: CheckCircle,
      };
    if (email.deliveredCount > 0 && email.failedCount > 0)
      return {
        label: "Partial",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        Icon: AlertCircle,
      };
    return {
      label: "Sent",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      Icon: Send,
    };
  };

  if (emailHistory.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No email campaigns found
          </h3>
          <p className="mt-2 text-gray-500">
            {totalCount === 0
              ? "You haven't sent any emails yet."
              : "No campaigns match your filters."}
          </p>
          {totalCount === 0 && (
            <div className="mt-6">
              <Button asChild>
                <Link href="/send-email">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Your First Email
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelectAll}
              onCheckedChange={handleSelectAll}
              disabled={isPending}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({emailHistory.length})
            </span>
          </div>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isPending || totalCount === 0}
          className="text-destructive hover:text-destructive bg-transparent"
        >
          <Trash className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Summary + pagination header */}
      <div className="flex items-center justify-between text-sm text-gray-600 flex-wrap gap-2">
        <p>
          Showing {(currentPage - 1) * 10 + 1}–
          {Math.min(currentPage * 10, totalCount)} of {totalCount} campaigns
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {emailHistory.map((email) => {
          const { label, color, Icon } = getOverallStatus(email);

          return (
            <Card key={email.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedItems.has(email.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(email.id, checked as boolean)
                      }
                      disabled={isPending}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CardTitle className="text-base font-semibold text-gray-900 truncate">
                          {email.subject}
                        </CardTitle>
                        <Badge className={`${color} border text-xs`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="font-medium">List:</span>
                          <span className="truncate">
                            {email.contactList.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                          <span className="font-medium">Domain:</span>
                          <span className="text-purple-600 truncate">
                            {email.contactList.domain.domain}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium">Sent:</span>
                          <span>
                            {new Date(email.createdAt).toLocaleDateString()} at{" "}
                            {new Date(email.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSingleDelete(email.id)}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenDetailId(email.id)}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* 5-metric grid: sent, delivered, opened, clicked, failed */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {
                      label: "Sent",
                      value: email.sentCount,
                      from: "from-blue-50",
                      to: "to-blue-100",
                      border: "border-blue-200",
                      text: "text-blue-700",
                      Icon: Send,
                    },
                    {
                      label: "Delivered",
                      value: email.deliveredCount,
                      from: "from-green-50",
                      to: "to-green-100",
                      border: "border-green-200",
                      text: "text-green-700",
                      Icon: CheckCircle,
                    },
                    {
                      label: "Opened",
                      value: email.openedCount,
                      from: "from-purple-50",
                      to: "to-purple-100",
                      border: "border-purple-200",
                      text: "text-purple-700",
                      Icon: Eye,
                    },
                    {
                      label: "Clicked",
                      value: email.clickedCount,
                      from: "from-indigo-50",
                      to: "to-indigo-100",
                      border: "border-indigo-200",
                      text: "text-indigo-700",
                      Icon: MousePointer,
                    },
                    {
                      label: "Failed",
                      value: email.failedCount,
                      from: "from-red-50",
                      to: "to-red-100",
                      border: "border-red-200",
                      text: "text-red-700",
                      Icon: XCircle,
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className={`text-center p-3 bg-gradient-to-br ${m.from} ${m.to} rounded-lg border ${m.border}`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <m.Icon className={`h-4 w-4 ${m.text}`} />
                        <span className={`text-xl font-bold ${m.text}`}>
                          {m.value}
                        </span>
                      </div>
                      <div className={`text-xs ${m.text} font-medium`}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rates row */}
                {email.sentCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Delivery Rate:</span>
                      <span className="font-bold text-green-700">
                        {Math.round(
                          (email.deliveredCount / email.sentCount) * 100,
                        )}
                        %
                      </span>
                    </div>
                    {email.deliveredCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Open Rate:</span>
                        <span className="font-bold text-purple-700">
                          {Math.round(
                            (email.openedCount / email.deliveredCount) * 100,
                          )}
                          %
                        </span>
                      </div>
                    )}
                    {email.deliveredCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Click Rate:</span>
                        <span className="font-bold text-indigo-700">
                          {Math.round(
                            (email.clickedCount / email.deliveredCount) * 100,
                          )}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              {/* Detail dialog for this card */}
              <EmailDetailDialog
                email={email}
                open={openDetailId === email.id}
                onClose={() => setOpenDetailId(null)}
              />
            </Card>
          );
        })}
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2)
                pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigateToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
