// 巡檢報表 PDF 匯出流程：抓簽名／照片、組版、觸發下載
import { pdf } from '@react-pdf/renderer';
import { fetchDriveFileAsObjectUrl, isDriveEnabled, requestDriveAccess } from '@/lib/googleDrive';
import { InspectionPdfDocument, type PhotoWithUrl } from './InspectionPdfDocument';
import type { InspInspection, InspInspectionItem, InspInspectionPhoto, InspProject } from '@/types';

interface GenerateInspectionPdfInput {
  inspection: InspInspection;
  project: InspProject;
  items: InspInspectionItem[];
  photos: InspInspectionPhoto[];
}

export async function generateInspectionPdf(
  data: GenerateInspectionPdfInput,
  userEmail: string,
): Promise<void> {
  const { inspection, project, items, photos } = data;
  const objectUrls: string[] = [];

  try {
    if (!isDriveEnabled()) {
      await requestDriveAccess(userEmail);
    }

    let signatureUrl: string | null = null;
    if (inspection.signature_file_id) {
      signatureUrl = await fetchDriveFileAsObjectUrl(inspection.signature_file_id);
      objectUrls.push(signatureUrl);
    }

    const photosWithUrl: PhotoWithUrl[] = await Promise.all(
      photos.map(async (photo) => {
        if (photo.upload_status !== 'uploaded' || !photo.drive_file_id) {
          return { photo, url: null };
        }
        const url = await fetchDriveFileAsObjectUrl(photo.drive_file_id);
        objectUrls.push(url);
        return { photo, url };
      }),
    );

    const blob = await pdf(
      InspectionPdfDocument({
        inspection,
        project,
        items,
        photos: photosWithUrl,
        signatureUrl,
      }),
    ).toBlob();

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${project.project_name}_${inspection.inspection_date}_巡檢報表.pdf`;
    link.click();
    // 延遲釋放，確保瀏覽器已開始讀取下載內容
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
