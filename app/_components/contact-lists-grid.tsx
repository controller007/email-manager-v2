"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Eye,
  ArrowRight,
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
  _count: { emailHistory: number; contacts: number };
}

interface ContactListsGridProps {
  contactLists: ContactListWithRelations[];
  domains: Domain[];
}

const ITEMS_PER_PAGE = 9;

function getContactCount(list: ContactListWithRelations) {
  return list._count?.contacts ?? list.emails.length;
}

// ── List Card ─────────────────────────────────────────────────────────────────

function ContactListCard({
  list,
  selected,
  onToggleSelect,
  viewMode,
}: {
  list: ContactListWithRelations;
  selected: boolean;
  onToggleSelect: () => void;
  viewMode: "grid" | "list";
}) {
  const count = getContactCount(list);
  const hasSenders = list.domain?.senders?.length > 0;

  if (viewMode === "list") {
    return (
      <div
        className={`flex items-center gap-4 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 hover:shadow-md transition-all ${selected ? "border-blue-300 bg-blue-50/30" : ""}`}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
        </div>

        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {list.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {list.name}
          </p>
          {list.description && (
            <p className="text-xs text-gray-500 truncate">{list.description}</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {count.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Contacts
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {list._count.emailHistory}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Campaigns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" asChild className="h-8 text-xs">
            <Link href={`/contact-lists/${list.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="h-8 text-xs">
            <Link href={`/send-email?listId=${list.id}`}>
              <Send className="h-3.5 w-3.5 mr-1" /> Send
            </Link>
          </Button>
          <EditContactListDialog contactList={list as any} >
            <button className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Edit className="h-3.5 w-3.5" />
            </button>
          </EditContactListDialog>
          <DeleteContactListDialog contactList={list as any}>
            <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DeleteContactListDialog>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${selected ? "border-blue-300 bg-blue-50/20" : "border-gray-100 hover:border-gray-200"}`}
    >
      {/* Card top */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {list.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {list.name}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Globe className="h-2.5 w-2.5" />
                {list.domain?.domain}
              </p>
            </div>
          </div>
          <Badge
            className={`text-[10px] shrink-0 border ${hasSenders ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
          >
            {hasSenders ? (
              <>
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                Ready
              </>
            ) : (
              <>
                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                No Sender
              </>
            )}
          </Badge>
        </div>

        {list.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 pl-12">
            {list.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pl-12">
          {[
            {
              label: "Contacts",
              value: count.toLocaleString(),
              color: "text-indigo-700",
            },
            {
              label: "Campaigns",
              value: list._count.emailHistory,
              color: "text-blue-700",
            },
            {
              label: "Senders",
              value: list.domain?.senders?.length ?? 0,
              color: "text-emerald-700",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-2 bg-gray-50 rounded-xl">
              <p className={`text-base font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Card footer */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {new Date(list.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/contact-lists/${list.id}`}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
          <span className="text-gray-200 mx-1">|</span>
          <Link
            href={`/send-email?listId=${list.id}`}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800"
          >
            <Send className="h-3 w-3" /> Send
          </Link>
          <span className="text-gray-200 mx-1">|</span>
          <EditContactListDialog contactList={list as any}>
            <button className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
              <Edit className="h-3.5 w-3.5" />
            </button>
          </EditContactListDialog>
          <DeleteContactListDialog contactList={list as any}>
            <button className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DeleteContactListDialog>
        </div>
      </div>
    </div>
  );
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
    value === "all"
      ? localStorage.removeItem("cl_domain_filter")
      : localStorage.setItem("cl_domain_filter", value);
    setDomainFilter(value);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("cl_view_mode", mode);
  };

  const filteredLists = contactLists.filter((list) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDomain =
      domainFilter === "all" || list.domain?.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

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
    if (selectedIds.size === paginatedLists.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedLists.map((l) => l.id)));
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

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search contact lists…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 rounded-xl text-sm"
          />
        </div>

        {uniqueDomains.length > 0 && (
          <Select value={domainFilter} onValueChange={handleDomainFilterChange}>
            <SelectTrigger className="w-[180px] rounded-xl text-sm">
              <Globe className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="All Domains" />
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
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 shrink-0">
          <button
            onClick={() => handleViewModeChange("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleViewModeChange("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Bulk select bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            id="select-all-lists"
          />
          <label
            htmlFor="select-all-lists"
            className="text-sm text-gray-500 cursor-pointer select-none"
          >
            Select all ({paginatedLists.length})
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
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete selected
            </Button>
          </div>
        )}
        {filteredLists.length !== contactLists.length && (
          <span className="text-xs text-gray-400 ml-auto">
            Showing {filteredLists.length} of {contactLists.length} lists
          </span>
        )}
      </div>

      {/* ── Grid / List ──────────────────────────────────────────────────── */}
      {paginatedLists.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            No lists match your filters
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting your search or domain filter.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedLists.map((list) => (
            <ContactListCard
              key={list.id}
              list={list}
              viewMode="grid"
              selected={selectedIds.has(list.id)}
              onToggleSelect={() => toggleSelection(list.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedLists.map((list) => (
            <ContactListCard
              key={list.id}
              list={list}
              viewMode="list"
              selected={selectedIds.has(list.id)}
              onToggleSelect={() => toggleSelection(list.id)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm ──────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} list{selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected contact list
              {selectedIds.size !== 1 ? "s" : ""} and all their contacts. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
