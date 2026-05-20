"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import {
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Plus,
  Mail,
  Shield,
  AlertCircle,
} from "lucide-react";
import {
  deleteDomain,
  deleteSender,
  getDomainRecords,
  verifyDomain,
} from "../(dashboard)/domains/actions";
import { DnsRecordsDisplay } from "./dns-record-display";
import { EditSenderDialog } from "./sender-dialogue";
import { AddSenderDialog } from "./add-sender";

interface Domain {
  id: string;
  domain: string;
  status: string;
  createdAt: Date;
  senders: Array<{ id: string; name: string; email: string }>;
}

export function DomainList({ domains }: { domains: Domain[] }) {
  return (
    <div className="space-y-4">
      {domains.map((domain) => (
        <DomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

function statusConfig(status: string) {
  switch (status) {
    case "verified":
      return {
        icon: CheckCircle,
        label: "Verified",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "pending":
      return {
        icon: Clock,
        label: "Pending",
        cls: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    default:
      return {
        icon: XCircle,
        label: "Not verified",
        cls: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
      };
  }
}

function DomainCard({ domain }: { domain: Domain }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const cfg = statusConfig(domain.status);
  const StatusIcon = cfg.icon;

  const handleVerify = async () => {
    setIsVerifying(true);
    setMessage("");
    const result = await verifyDomain(domain.id);
    setMessage(
      result.success
        ? result.message || "Verified!"
        : result.error || "Verification failed",
    );
    setMessageOk(!!result.success);
    if (result.success) router.refresh();
    setIsVerifying(false);
  };

  const handleToggleRecords = async () => {
    if (showRecords) {
      setShowRecords(false);
      return;
    }
    const result = await getDomainRecords(domain.id);
    if (result.success && result.records) {
      setRecords(result.records);
      setShowRecords(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteDomain(domain.id);
    if (result.success) router.refresh();
    setIsDeleting(false);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Domain header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${domain.status === "verified" ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100 border border-gray-200"}`}
          >
            <Globe
              className={`h-5 w-5 ${domain.status === "verified" ? "text-emerald-600" : "text-gray-500"}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">
                {domain.domain}
              </h3>
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Added{" "}
              {new Date(domain.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {domain.senders.length} sender
              {domain.senders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={isVerifying || domain.status === "verified"}
            className="rounded-xl"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Verify Domain
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleRecords}
            className="rounded-xl"
          >
            {showRecords ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Hide DNS
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View DNS
              </>
            )}
          </Button>

          {domain.status === "verified" && (
            <AddSenderDialog domainId={domain.id} domainName={domain.domain} />
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                disabled={isDeleting}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete domain?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes <strong>{domain.domain}</strong> and
                  all its senders. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className="px-6 pb-3">
          <Alert
            className={
              messageOk
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }
          >
            <AlertCircle
              className={`h-4 w-4 ${messageOk ? "text-emerald-600" : "text-red-600"}`}
            />
            <AlertDescription
              className={messageOk ? "text-emerald-800" : "text-red-800"}
            >
              {message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* DNS Records */}
      {showRecords && records.length > 0 && (
        <div className="px-6 pb-4">
          <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
            <DnsRecordsDisplay
              records={records}
              domain={domain.domain}
              domainId={domain.id}
              onClose={() => setShowRecords(false)}
            />
          </div>
        </div>
      )}

      {/* Senders */}
      {domain.senders.length > 0 ? (
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Senders ({domain.senders.length})
          </p>
          <div className="space-y-2">
            {domain.senders.map((sender) => (
              <SenderRow
                key={sender.id}
                sender={sender}
                domainName={domain.domain}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-6 py-4 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                No senders yet
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {domain.status === "verified"
                  ? "Add a sender email address (e.g. noreply@yourdomain.com) to start sending campaigns."
                  : "Verify your domain first, then add sender email addresses."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SenderRow({
  sender,
  domainName,
}: {
  sender: { id: string; name: string; email: string };
  domainName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteSender(sender.id);
    if (result.success) router.refresh();
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {sender.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {sender.name}
        </p>
        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
          <Mail className="h-2.5 w-2.5" /> {sender.email}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <EditSenderDialog sender={sender} domainName={domainName} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete sender"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete sender?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes <strong>{sender.email}</strong>. Any
                contact lists using this sender will need a new one assigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Sender"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
