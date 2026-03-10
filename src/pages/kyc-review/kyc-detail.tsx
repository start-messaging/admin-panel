import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getKycDetail, reviewKyc } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES, STORAGE_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function KycDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', userId],
    queryFn: () => getKycDetail(userId!),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (payload: { action: 'approve' | 'reject'; rejectionReason?: string }) =>
      reviewKyc(userId!, payload),
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'approve' ? 'KYC approved successfully' : 'KYC rejected',
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      navigate(ROUTES.KYC_REVIEW);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const documentApiUrl = user?.kycDocumentPath
    ? `${apiBase}/admin/kyc/${user.id}/document`
    : null;
  const isImage =
    user?.kycDocumentPath && /\.(jpg|jpeg|png|webp)$/i.test(user.kycDocumentPath);

  useEffect(() => {
    if (!documentApiUrl) return;
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    fetch(documentApiUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => setDocBlobUrl(URL.createObjectURL(blob)))
      .catch(() => setDocBlobUrl(null));
    return () => {
      if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentApiUrl]);

  function handleApprove() {
    mutation.mutate({ action: 'approve' });
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    mutation.mutate({ action: 'reject', rejectionReason: rejectionReason.trim() });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">User not found</p>
        <Link to={ROUTES.KYC_REVIEW} className="text-sm text-primary hover:underline">
          Back to KYC Reviews
        </Link>
      </div>
    );
  }

  const isPending = user.kycStatus === 'pending';

  const statusConfig = {
    pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
    not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-700', icon: Clock },
  };

  const status = statusConfig[user.kycStatus];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.KYC_REVIEW)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
            status.className,
          )}
        >
          <StatusIcon className="size-3.5" />
          {status.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User info */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">User Information</h2>
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Mobile" value={user.mobileNumber ?? 'Not provided'} />
            <InfoRow icon={Globe} label="Country" value={user.country ?? 'Not provided'} />
            <InfoRow
              icon={CheckCircle2}
              label="Mobile Verified"
              value={user.mobileVerified ? 'Yes' : 'No'}
            />
            <InfoRow
              icon={Clock}
              label="Registered"
              value={new Date(user.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        </div>

        {/* Business details */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Business Details</h2>
          <div className="space-y-3">
            <InfoRow
              icon={Building2}
              label="Business Name"
              value={user.businessName ?? 'Not provided'}
            />
            <InfoRow icon={FileText} label="PAN" value={user.pan ?? 'Not provided'} />
            <InfoRow icon={FileText} label="GSTIN" value={user.gstin ?? 'Not provided'} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={user.businessAddress ?? 'Not provided'}
            />
            <InfoRow
              icon={Globe}
              label="Website"
              value={user.websiteUrl ?? 'Not provided'}
              isLink={!!user.websiteUrl}
            />
          </div>
        </div>

        {/* Document */}
        <div className="space-y-4 rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">KYC Document</h2>
          {user.kycDocumentPath ? (
            <div className="space-y-3">
              {docBlobUrl ? (
                isImage ? (
                  <img
                    src={docBlobUrl}
                    alt="KYC Document"
                    className="max-h-96 rounded-lg border object-contain"
                  />
                ) : (
                  <iframe
                    src={docBlobUrl}
                    title="KYC Document"
                    className="h-[500px] w-full rounded-lg border"
                  />
                )
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {docBlobUrl && (
                <a
                  href={docBlobUrl}
                  download={user.kycDocumentPath.split('/').pop()}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Download document
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No document uploaded</p>
          )}
        </div>

        {/* Rejection reason (if rejected) */}
        {user.kycStatus === 'rejected' && user.kycRejectionReason && (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-5 lg:col-span-2">
            <h2 className="font-semibold text-red-700">Rejection Reason</h2>
            <p className="text-sm text-red-600">{user.kycRejectionReason}</p>
            {user.kycReviewedAt && (
              <p className="text-xs text-red-400">
                Reviewed on{' '}
                {new Date(user.kycReviewedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Approval info (if approved) */}
        {user.kycStatus === 'approved' && user.kycReviewedAt && (
          <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-5 lg:col-span-2">
            <h2 className="font-semibold text-green-700">Approved</h2>
            <p className="text-sm text-green-600">
              Approved on{' '}
              {new Date(user.kycReviewedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="rounded-xl border bg-card p-5">
          {showRejectForm ? (
            <div className="space-y-4">
              <h2 className="font-semibold">Reject KYC</h2>
              <textarea
                placeholder="Provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={mutation.isPending || !rejectionReason.trim()}
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Review Actions</h2>
                <p className="text-sm text-muted-foreground">
                  Approve or reject this KYC submission
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={mutation.isPending}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}
