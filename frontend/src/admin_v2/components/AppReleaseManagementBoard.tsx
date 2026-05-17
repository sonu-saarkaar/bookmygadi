import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, FileUp, RefreshCw, Smartphone } from "lucide-react";
import { adminV2Api, type AppReleaseItem } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card, Chip } from "@/admin_v2/components/ui";

type AppType = "user" | "rider";

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
};

const latestFor = (rows: AppReleaseItem[], appType: AppType) =>
  rows
    .filter((row) => row.app_type === appType)
    .sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime())[0] || null;

const ReleaseUploadCard = ({
  appType,
  latest,
  onUploaded,
}: {
  appType: AppType;
  latest: AppReleaseItem | null;
  onUploaded: () => void;
}) => {
  const { pushToast } = useAdminV2Store();
  const [versionName, setVersionName] = useState(latest?.version_name || "1.0");
  const [versionCode, setVersionCode] = useState(latest?.version_code || "");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const label = appType === "user" ? "User App" : "Rider App";
  const accent = appType === "user" ? "emerald" : "amber";

  useEffect(() => {
    if (!latest) return;
    setVersionName(latest.version_name || "1.0");
    setVersionCode(latest.version_code || "");
  }, [latest?.id]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      pushToast(`Select ${label} APK first`, "warning");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".apk")) {
      pushToast("Only .apk files are allowed", "warning");
      return;
    }
    if (!versionName.trim()) {
      pushToast("Version name is required", "warning");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await adminV2Api.uploadAppRelease({
        app_type: appType,
        version_name: versionName.trim(),
        version_code: versionCode.trim(),
        release_notes: releaseNotes.trim(),
        file,
      });
      pushToast(`${label} ${uploaded.version_name} is live for download`, "success");
      setFile(null);
      setReleaseNotes("");
      onUploaded();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "APK upload failed", "danger");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-lg ${accent === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            <Smartphone size={22} />
          </div>
          <div>
            <p className="text-lg font-black text-slate-900">{label}</p>
            <p className="text-xs font-semibold text-slate-500">Upload APK and publish latest download</p>
          </div>
        </div>
        <Chip text={latest ? "Live" : "No APK"} tone={latest ? "success" : "warning"} />
      </div>

      {latest && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">Latest: v{latest.version_name}</p>
              <p className="text-xs font-semibold text-slate-500">
                {latest.file_name} · {formatBytes(latest.file_size)} · {new Date(latest.uploaded_at).toLocaleString("en-IN")}
              </p>
            </div>
            <a
              href={latest.download_url}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              <Download size={16} />
              Test Download
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Version Name</span>
            <input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="1.0.1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Version Code</span>
            <input
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="2"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">APK File</span>
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
          />
          {file && <span className="mt-1 block text-xs font-semibold text-slate-500">{file.name} · {formatBytes(file.size)}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Release Notes</span>
          <textarea
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            className="mt-1 min-h-[82px] w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-emerald-500"
            placeholder="Latest app changes, bug fixes, new feature details"
          />
        </label>
        <Button type="submit" variant="solid" disabled={uploading} className="h-11 w-full">
          <FileUp size={17} className="mr-2 inline" />
          {uploading ? "Uploading APK..." : `Publish ${label} APK`}
        </Button>
      </form>
    </Card>
  );
};

export const AppReleaseManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [rows, setRows] = useState<AppReleaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const latestUser = useMemo(() => latestFor(rows, "user"), [rows]);
  const latestRider = useMemo(() => latestFor(rows, "rider"), [rows]);

  const loadRows = async () => {
    setLoading(true);
    try {
      setRows(await adminV2Api.listAppReleases());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Unable to load app releases", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    pushToast("Download link copied", "success");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-black text-slate-900">App Download Manager</p>
          <p className="text-sm font-semibold text-slate-500">Upload User/Rider APK. Latest upload becomes live on web.bookmygadi.app download buttons.</p>
        </div>
        <Button onClick={loadRows} disabled={loading}>
          <RefreshCw size={16} className="mr-2 inline" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReleaseUploadCard appType="user" latest={latestUser} onUploaded={loadRows} />
        <ReleaseUploadCard appType="rider" latest={latestRider} onUploaded={loadRows} />
      </div>

      <Card className="overflow-hidden rounded-lg p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="font-black text-slate-900">Release History</p>
          <p className="text-xs font-semibold text-slate-500">Newest APK uploads are shown first.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">App</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isLatest = row.id === latestUser?.id || row.id === latestRider?.id;
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold capitalize text-slate-800">{row.app_type} app</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">v{row.version_name}</p>
                      <p className="text-xs text-slate-500">{row.version_code ? `Code ${row.version_code}` : "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[280px] truncate font-semibold text-slate-700">{row.file_name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(row.file_size)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(row.uploaded_at).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      {isLatest ? (
                        <Chip text="Latest Live" tone="success" />
                      ) : (
                        <Chip text="Archived" tone="neutral" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(row.download_url)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          title="Copy download link"
                        >
                          <Copy size={16} />
                        </button>
                        <a
                          href={row.download_url}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          title="Download APK"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="mx-auto mb-2 text-slate-300" size={24} />
                    No APK uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
