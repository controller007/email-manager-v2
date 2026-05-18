"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/_components/ui/alert-dialog";
import { Input } from "@/app/_components/ui/input";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { EditContactListDialog } from "./edit-contact-list-dialog";
import { DeleteContactListDialog } from "./delete-contact-list-dialog";
import {
  Users,
  Mail,
  Edit,
  Trash2,
  Calendar,
  Globe,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Eye,
} from "lucide-react";
import type { Domain, Sender } from "@prisma/client";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactListWithRelations {
  id: string;
  name: string;
  description?: string | null;
  emails: string[];
  status: string;
  createdAt: Date;
  domain: Domain & { senders: Sender[] };
  _count: {
    emailHistory: number;
    contacts: number;
  };
}

interface ContactListsGridProps {
  contactLists: ContactListWithRelations[];
  domains: Domain[];
}

const ITEMS_PER_PAGE = 9;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getContactCount(list: ContactListWithRelations): number {
  // Prefer the Contact table count; fall back to emails[] length
  return list._count?.contacts ?? list.emails.length;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContactListsGrid({
  contactLists,
  domains,
}: ContactListsGridProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const uniqueDomains = domains.map((d) => d.domain);

  // Persist domain filter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cl_domain_filter");
      if (saved) setDomainFilter(saved);
      const savedView = localStorage.getItem("cl_view_mode") as
        | "grid"
        | "list"
        | null;
      if (savedView) setViewMode(savedView);
    }
  }, []);

  const handleDomainFilterChange = (value: string) => {
    if (value === "all") localStorage.removeItem("cl_domain_filter");
    else localStorage.setItem("cl_domain_filter", value);
    setDomainFilter(value);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("cl_view_mode", mode);
  };

  // Filter
  const filteredLists = contactLists.filter((list) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDomain =
      domainFilter === "all" || list.domain?.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLists = filteredLists.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLists.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLists.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/contact-lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      setSelectedIds(new Set());
      setCurrentPage(1);
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete contact lists",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected =
    paginatedLists.length > 0 && selectedIds.size === paginatedLists.length;

  if (contactLists.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No contact lists yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create your first contact list. You'll need a verified domain first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contact lists..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {uniqueDomains.length > 0 && (
          <Select
            key={domainFilter}
            value={domainFilter}
            onValueChange={handleDomainFilterChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {uniqueDomains.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 self-start">
          <button
            onClick={() => handleViewModeChange("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "grid"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            onClick={() => handleViewModeChange("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>

        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* ── Select All ──────────────────────────────────────────────────── */}
      {paginatedLists.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label
            htmlFor="select-all"
            className="text-sm text-gray-600 cursor-pointer select-none"
          >
            Select all on this page ({paginatedLists.length})
          </label>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {paginatedLists.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedLists.map((list) => (
                <GridCard
                  key={list.id}
                  list={list}
                  selected={selectedIds.has(list.id)}
                  onToggle={() => toggleSelection(list.id)}
                />
              ))}
            </div>
          ) : (
            <ListTable
              lists={paginatedLists}
              selectedIds={selectedIds}
              onToggle={toggleSelection}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-6">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}–
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredLists.length)} of{" "}
                {filteredLists.length} lists
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No contact lists found
            </h3>
            <p className="mt-2 text-gray-500">
              {searchQuery || domainFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first contact list to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Lists?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} contact list
              {selectedIds.size !== 1 ? "s" : ""}? This will also remove all
              associated contacts and email history. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} List${selectedIds.size !== 1 ? "s" : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────────────

function GridCard({
  list,
  selected,
  onToggle,
}: {
  list: ContactListWithRelations;
  selected: boolean;
  onToggle: () => void;
}) {
  const count = getContactCount(list);

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 relative ${
        selected ? "ring-2 ring-blue-500 border-blue-500" : ""
      }`}
    >
      {/* Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <CardHeader className="pb-3 pl-12">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-gray-900 truncate mb-1">
              {list.name}
            </CardTitle>
            {list.description && (
              <p className="text-xs text-gray-500 truncate mb-1">
                {list.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-blue-600 font-medium truncate text-xs">
                {list.domain.domain}
              </span>
              <Badge
                variant="outline"
                className="text-xs bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <EditContactListDialog contactList={list as any}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </EditContactListDialog>
            <DeleteContactListDialog contactList={list as any}>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteContactListDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xl font-bold text-blue-700">{count}</span>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              Contact{count !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Mail className="h-4 w-4 text-purple-600" />
              <span className="text-xl font-bold text-purple-700">
                {list._count.emailHistory}
              </span>
            </div>
            <div className="text-xs text-purple-600 font-medium">
              Campaign{list._count.emailHistory !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Senders */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">
              Available Senders
            </span>
          </div>
          {list.domain.senders.length > 0 ? (
            <div className="space-y-1">
              {list.domain.senders.slice(0, 2).map((sender) => (
                <div key={sender.id} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {sender.name}
                  </Badge>
                  <span className="text-xs text-gray-500 truncate">
                    {sender.email}
                  </span>
                </div>
              ))}
              {list.domain.senders.length > 2 && (
                <p className="text-xs text-gray-500 mt-1">
                  +{list.domain.senders.length - 2} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No senders configured</p>
          )}
        </div>

        {/* Sample emails */}
        {list.emails.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-700 mb-1.5">
              Sample Contacts:
            </p>
            <div className="space-y-1">
              {list.emails.slice(0, 3).map((email, i) => (
                <p
                  key={i}
                  className="text-xs text-green-800 truncate font-mono"
                >
                  {email}
                </p>
              ))}
              {list.emails.length > 3 && (
                <p className="text-xs text-green-600 font-medium">
                  +{list.emails.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">
            Created{" "}
            {new Date(list.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/contact-lists/${list.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View Contacts
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`/send-email?listId=${list.id}`}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send Email
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── List Table View ───────────────────────────────────────────────────────────

function ListTable({
  lists,
  selectedIds,
  onToggle,
}: {
  lists: ContactListWithRelations[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <table className="border border-gray-200 rounded-xl overflow-hidden w-full">
      {/* Header */}
      <tr className=" gap-4 px-4 py-2.5 bg-white border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <th />
        <th className="text-left p-3">Name / Domain</th>
        <th>Contacts</th>
        <th>Campaigns</th>
        <th>Created</th>
        <th className="text-right p-3">Actions</th>
      </tr>

      {/* Rows */}
      <tbody className="divide-y divide-gray-100">
        {lists.map((list) => {
          const count = getContactCount(list);
          return (
            <tr
              key={list.id}
              className={` gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                selectedIds.has(list.id) ? "bg-blue-50" : ""
              }`}
            >
              <td className="p-3">
                <Checkbox
                  checked={selectedIds.has(list.id)}
                  onCheckedChange={() => onToggle(list.id)}
                />
              </td>

              <td className="min-w-0 ">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {list.name}
                </p>
                {list.description && (
                  <p className="text-xs text-gray-400 truncate">
                    {list.description}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <Globe className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600">
                    {list.domain.domain}
                  </span>
                </div>
              </td>

              <td className="text-center">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 bg-blue-50 rounded-full px-2.5 py-0.5">
                  <Users className="h-3 w-3" />
                  {count}
                </span>
              </td>

              <td className="text-center">
                <span className="text-sm font-semibold text-purple-700">
                  {list._count.emailHistory}
                </span>
              </td>

              <td className="text-center">
                <p className="text-xs text-gray-500 text-center">
                  {new Date(list.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </td>

              <td className=" p-3">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Link href={`/contact-lists/${list.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Contacts
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="h-7 px-2 text-xs">
                    <Link href={`/send-email?listId=${list.id}`}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Send
                    </Link>
                  </Button>
                  <EditContactListDialog contactList={list as any}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </EditContactListDialog>
                  <DeleteContactListDialog contactList={list as any}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </DeleteContactListDialog>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
