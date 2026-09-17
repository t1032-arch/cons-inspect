// 巡檢報表 PDF 版面定義，見 workplan_v2.md（匯出巡檢紀錄）
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { INSPECTION_ITEM_DEFINITIONS, RESULT_LABELS } from '@/constants/inspectionItems';
import type { InspInspection, InspInspectionItem, InspInspectionPhoto, InspProject } from '@/types';

// 字型檔放在 public/fonts，用本機路徑載入避免依賴外部字型 CDN 的可用性
Font.register({
  family: 'Noto Sans TC',
  fonts: [
    { src: '/fonts/NotoSansTC-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansTC-Bold.ttf', fontWeight: 700 },
  ],
});

const RESULT_COLORS: Record<string, string> = {
  good: '#16a34a',
  acceptable: '#d97706',
  poor: '#dc2626',
  na: '#64748b',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans TC',
    fontSize: 10,
    padding: 32,
    color: '#1e293b',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#64748b',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9',
    paddingVertical: 3,
  },
  itemTitle: {
    flex: 1,
  },
  itemResult: {
    width: 60,
    textAlign: 'right',
    fontWeight: 700,
  },
  poorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
  },
  poorTitle: {
    color: '#dc2626',
    fontWeight: 700,
    marginBottom: 2,
  },
  note: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  signatureImage: {
    width: 160,
    height: 80,
    objectFit: 'contain',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  photoCell: {
    width: '50%',
    paddingRight: 6,
    paddingBottom: 10,
  },
  photoImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export interface PhotoWithUrl {
  photo: InspInspectionPhoto;
  url: string | null;
}

interface InspectionPdfDocumentProps {
  inspection: InspInspection;
  project: InspProject;
  items: InspInspectionItem[];
  photos: PhotoWithUrl[];
  signatureUrl: string | null;
}

export function InspectionPdfDocument({
  inspection,
  project,
  items,
  photos,
  signatureUrl,
}: InspectionPdfDocumentProps) {
  const resultByItemNo = new Map(items.map((item) => [item.item_no, item.result]));
  const poorItems = INSPECTION_ITEM_DEFINITIONS.filter(
    (def) => resultByItemNo.get(def.item_no) === 'poor',
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{project.project_name} 巡檢報表</Text>
        <Text style={styles.subtitle}>
          {inspection.inspection_date} {inspection.inspection_time} ・ {inspection.location}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>案件資訊</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text>
                <Text style={styles.infoLabel}>承攬廠商：</Text>
                {project.contractor}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text>
                <Text style={styles.infoLabel}>案件地點：</Text>
                {project.location}
              </Text>
            </View>
            {project.department && (
              <View style={styles.infoItem}>
                <Text>
                  <Text style={styles.infoLabel}>承辦單位：</Text>
                  {project.department}
                </Text>
              </View>
            )}
            {project.manager && (
              <View style={styles.infoItem}>
                <Text>
                  <Text style={styles.infoLabel}>負責人：</Text>
                  {project.manager}
                </Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text>
                <Text style={styles.infoLabel}>巡檢人員：</Text>
                {inspection.inspector}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>巡檢結果</Text>
          {INSPECTION_ITEM_DEFINITIONS.map((def) => {
            const result = resultByItemNo.get(def.item_no);
            return (
              <View key={def.item_no} style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {def.item_no}. {def.title}
                </Text>
                <Text style={[styles.itemResult, { color: result ? RESULT_COLORS[result] : '#94a3b8' }]}>
                  {result ? RESULT_LABELS[result] : '未填寫'}
                </Text>
              </View>
            );
          })}
          {poorItems.length > 0 && (
            <View style={styles.poorBox}>
              <Text style={styles.poorTitle}>不良項目：</Text>
              {poorItems.map((def) => (
                <Text key={def.item_no}>
                  {def.item_no}. {def.title}
                </Text>
              ))}
            </View>
          )}
        </View>

        {inspection.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備註</Text>
            <Text style={styles.note}>{inspection.note}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>簽名</Text>
          {signatureUrl ? (
            <Image src={signatureUrl} style={styles.signatureImage} />
          ) : (
            <Text style={{ color: '#94a3b8' }}>未簽名</Text>
          )}
        </View>

        {photos.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>現場照片（{photos.length} 張）</Text>
            <View style={styles.photoGrid}>
              {photos.map(({ photo, url }) => (
                <View key={photo.id} style={styles.photoCell}>
                  {url ? (
                    <Image src={url} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                        {photo.upload_status === 'failed' ? '上傳失敗' : '未上傳'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.photoCaption}>{photo.caption || photo.filename}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
