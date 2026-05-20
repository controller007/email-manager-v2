import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { Globe, Plus, Shield, CheckCircle, Clock } from "lucide-react";
import { getAllDomains } from "./actions";
import { AddDomainDialog } from "../../_components/domain-dialgue";
import { DomainList } from "../../_components/domain-list";

export default async function DomainsPage() {
  const user = await requireAuth();
  const { domains } = await getAllDomains();

  const verified = domains?.filter((d) => d.status === "verified").length ?? 0;
  const pending = domains?.filter((d) => d.status === "pending").length ?? 0;
  const total = domains?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shadow-md shadow-teal-200">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure sending domains and email senders
            </p>
          </div>
        </div>
        <AddDomainDialog />
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Domains",
              value: total,
              icon: Globe,
              bg: "bg-gray-50",
              border: "border-gray-200",
              text: "text-gray-700",
            },
            {
              label: "Verified",
              value: verified,
              icon: CheckCircle,
              bg: "bg-emerald-50",
              border: "border-emerald-200",
              text: "text-emerald-700",
            },
            {
              label: "Pending",
              value: pending,
              icon: Clock,
              bg: "bg-amber-50",
              border: "border-amber-200",
              text: "text-amber-700",
            },
          ].map(({ label, value, icon: Icon, bg, border, text }) => (
            <div
              key={label}
              className={`${bg} ${border} border rounded-2xl p-4 flex items-center gap-3`}
            >
              <div className={`p-2.5 ${bg} border ${border} rounded-xl`}>
                <Icon className={`h-4 w-4 ${text}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Domain List or Empty State ─────────────────────────────────── */}
      {domains && domains.length > 0 ? (
        <DomainList domains={domains as any} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 text-teal-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            No domains yet
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Add a domain you own to send professional emails with your brand.
          </p>
          <div className="mt-5">
            <AddDomainDialog />
          </div>
        </div>
      )}

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900">
            How domain verification works
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "1",
              title: "Add your domain",
              desc: "Enter the domain you want to use for sending emails.",
            },
            {
              step: "2",
              title: "Configure DNS",
              desc: "Add the provided SPF, DKIM, and DMARC records to your DNS provider.",
            },
            {
              step: "3",
              title: "Verify",
              desc: "Click verify once DNS records are added. Propagation can take up to 48 hours.",
            },
            {
              step: "4",
              title: "Create senders",
              desc: "Add sender addresses like noreply@yourdomain.com to use in campaigns.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
