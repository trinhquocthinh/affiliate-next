'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ReconciliationContent() {
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<string>('SHOPEE');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const router = useRouter();

  const { data, isLoading } = useSWR(runId ? `/api/reconciliation/${runId}` : null, fetcher);

  const handleUpload = async () => {
    if (!file) return;
    try {
      setIsUploading(true);
      setProgress(10); // Start processing

      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', platform);

      setProgress(40); // Uploading

      const res = await fetch('/api/reconciliation/import', {
        method: 'POST',
        body: formData,
      });

      setProgress(80); // Processing on server

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Có lỗi xảy ra khi tải lên');
      }

      setProgress(100);
      toast.success('Đã nạp báo cáo đối soát');
      router.push(`/reconciliation?runId=${json.data.runId}`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi nạp file');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleExport = () => {
    if (!runId) return;
    window.location.href = `/api/reconciliation/${runId}/export`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Đối soát tự động</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nạp báo cáo hoa hồng</CardTitle>
          <CardDescription>Chọn tệp CSV báo cáo từ sàn để hệ thống tự động dò khớp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={platform} onValueChange={(val) => setPlatform(val || 'SHOPEE')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn sàn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOPEE">Shopee</SelectItem>
                <SelectItem value="TIKTOK">TikTok Shop</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? `Đang xử lý ${progress}%...` : 'Tải lên & Khớp tự động'}
            </Button>
          </div>

          {isUploading && (
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-4">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {runId && isLoading && <div className="text-center py-8">Đang tải kết quả...</div>}

      {runId && data?.ok && data.data && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Kết quả đối soát</h2>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Xuất Excel
            </Button>
          </div>

          <div className="space-y-6">
            {/* Nhóm A - Mặc định thu gọn */}
            <details className="group border rounded-lg p-4 bg-card" open={false}>
              <summary className="font-semibold text-lg cursor-pointer flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Ghép thành công (Nhóm A) - {data.data.groupA.length} dòng
              </summary>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Yêu Cầu</TableHead>
                      <TableHead>ID Đơn Hàng</TableHead>
                      <TableHead>Tên Sản Phẩm</TableHead>
                      <TableHead>Trạng Thái (Sàn)</TableHead>
                      <TableHead>Phương Pháp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.groupA.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : (
                      data.data.groupA.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-primary">
                            {row.matchedRequest?.id || row.matchedRequestId}
                          </TableCell>
                          <TableCell>{row.orderId}</TableCell>
                          <TableCell className="max-w-xs truncate" title={row.itemName}>{row.itemName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.orderStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.matchMethod === 'SUB_ID' ? 'default' : 'secondary'}>
                              {row.matchMethod}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </details>

            {/* Nhóm B - Mặc định mở */}
            <details className="group border rounded-lg p-4 bg-card border-orange-200" open={true}>
              <summary className="font-semibold text-lg cursor-pointer flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Dòng báo cáo dư (Nhóm B) - {data.data.groupB.length} dòng
              </summary>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Đơn Hàng</TableHead>
                      <TableHead>Item ID</TableHead>
                      <TableHead>Tên Sản Phẩm</TableHead>
                      <TableHead>Sub_ID1</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.groupB.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : (
                      data.data.groupB.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.orderId}</TableCell>
                          <TableCell>{row.itemId}</TableCell>
                          <TableCell className="max-w-xs truncate" title={row.itemName}>{row.itemName}</TableCell>
                          <TableCell>{row.subId1 || <span className="text-muted-foreground italic">Trống</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.orderStatus}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </details>

            {/* Nhóm C - Mặc định mở */}
            <details className="group border rounded-lg p-4 bg-card border-red-200" open={true}>
              <summary className="font-semibold text-lg cursor-pointer flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Yêu cầu chờ mà không thấy (Nhóm C) - {data.data.groupC.length} yêu cầu
              </summary>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Yêu Cầu</TableHead>
                      <TableHead>ID Đơn Hàng (User điền)</TableHead>
                      <TableHead>Item ID (Từ Link)</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Người giữ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.groupC.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : (
                      data.data.groupC.map((req: any) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-red-700">{req.id}</TableCell>
                          <TableCell>{req.orderId || <span className="text-muted-foreground italic">Trống</span>}</TableCell>
                          <TableCell>{req.productItemId || <span className="text-muted-foreground italic">Trống</span>}</TableCell>
                          <TableCell>{req.orderAmount ? `${req.orderAmount} ₫` : <span className="text-muted-foreground italic">Trống</span>}</TableCell>
                          <TableCell>{req.affiliateOwner?.displayName || <span className="text-muted-foreground italic">Trống</span>}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReconciliationPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4">Đang tải...</div>}>
      <ReconciliationContent />
    </Suspense>
  );
}
