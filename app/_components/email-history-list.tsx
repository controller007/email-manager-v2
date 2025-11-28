"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { EmailDetailDialog } from "./email-detail-dialog";
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

interface EmailHistoryItem {
  id: string;
  subject: string;
  body: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  failedCount: number;
  createdAt: Date;
  contactList: {
    name: string;
    domain: {
      domain: string;
    };
    _count: {
      emailHistory: number;
    };
  };
  broadcastId: string | null;
}

interface EmailHistoryListProps {
  emailHistory: EmailHistoryItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

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

  useEffect(() => {
    async function refresh() {
      try {
        await fetch("/api/email-history", { method: "PUT" });
        router.refresh();
      } catch (err) {
        console.error("Failed to refresh email history:", err);
      }
    }
    refresh();
  }, [router]);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
      setIsSelectAll(false);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(emailHistory.map((item) => item.id));
      setSelectedItems(allIds);
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
      } catch (error) {
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
            <span className="!text-green-600">
              All email history cleared successfully.
            </span>
          ),
        });
        router.refresh();
      } catch (error) {
        toast("Error", {
          description: (
            <span className="!text-red-500">
              Failed to clear all email history.
            </span>
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
          description: (
            <span className="!text-green-600">Email deleted successfully.</span>
          ),
        });
        router.refresh();
      } catch (error) {
        toast("Error", {
          description: (
            <span className="!text-red-500">Failed to delete email.</span>
          ),
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
    if (email.failedCount > 0 && email.deliveredCount === 0) {
      return { label: "Failed", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle };
    }
    if (email.deliveredCount > 0 && email.failedCount === 0) {
      return { label: "Delivered", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle };
    }
    if (email.deliveredCount > 0 && email.failedCount > 0) {
      return { label: "Partial", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: AlertCircle };
    }
    return { label: "Pending", color: "bg-gray-100 text-gray-700 border-gray-300", icon: Clock };
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
              ? "You haven't sent any emails yet. Create your first campaign to get started."
              : "No campaigns match your current filters. Try adjusting your search criteria."}
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/send-email">
                <Mail className="mr-2 h-4 w-4" />
                Send Your First Email
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>
          Showing {(currentPage - 1) * 10 + 1} to{" "}
          {Math.min(currentPage * 10, totalCount)} of {totalCount} campaigns
        </p>
        <div className="flex items-center gap-4">
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

      {/* Email History Cards */}
      <div className="space-y-4">
        {emailHistory.map((email) => {
          const status = getOverallStatus(email);
          const StatusIcon = status.icon;
          
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
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {email.subject}
                        </CardTitle>
                        <Badge className={`${status.color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">List:</span>
                          <span className="truncate">{email.contactList.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Domain:</span>
                          <span className="text-purple-600 truncate">{email.contactList.domain.domain}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Sent:</span>
                          <span>
                            {new Date(email.createdAt).toLocaleDateString()} at{" "}
                            {new Date(email.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {email.broadcastId && (
                          <div className="flex items-center gap-1">
                            <Send className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Broadcast ID:</span>
                            <span className="text-xs font-mono truncate">{email.broadcastId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSingleDelete(email.id)}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <EmailDetailDialog email={email}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </EmailDetailDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Send className="h-4 w-4 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-700">
                        {email.sentCount}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 font-medium">Sent</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-2xl font-bold text-green-700">
                        {email.deliveredCount}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 font-medium">Delivered</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="h-4 w-4 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-700">
                        {email.openedCount}
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 font-medium">Opened</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-2xl font-bold text-red-700">
                        {email.failedCount}
                      </span>
                    </div>
                    <div className="text-xs text-red-600 font-medium">Failed</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {email.sentCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Delivery Rate:</span>
                        <span className="font-bold text-green-700">
                          {Math.round((email.deliveredCount / email.sentCount) * 100)}%
                        </span>
                      </div>
                      
                      {email.deliveredCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Open Rate:</span>
                          <span className="font-bold text-purple-700">
                            {Math.round((email.openedCount / email.deliveredCount) * 100)}%
                          </span>
                        </div>
                      )}
                      
                      {email.failedCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Failure Rate:</span>
                          <span className="font-bold text-red-700">
                            {Math.round((email.failedCount / email.sentCount) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* List Stats */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      This list has been used for {email.contactList._count.emailHistory} campaign{email.contactList._count.emailHistory !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {/* Page Numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

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