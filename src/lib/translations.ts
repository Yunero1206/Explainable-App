export type Locale = 'en' | 'vi' | 'es' | 'fr' | 'zh-CN' | 'ja';

export const LOCALES: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
];

export const translations = {
  en: {
    // LeftSidebar
    newCase: 'New Case',
    recentCases: 'Recent Cases',
    noActiveCases: 'No active case records.',
    renameCase: 'Rename Case',
    deleteCase: 'Delete Case',
    caseNumber: 'Case Number',
    caseName: 'Case Name',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    delete: 'Delete',
    archive: 'Archive',
    rename: 'Rename',
    confirmDelete: 'Are you sure you want to delete case',
    deleteWarning: 'This action cannot be undone. All associated timeline events, claims, and evidence links will be permanently deleted from this session.',
    deleteCaseBtn: 'Delete Case',

    // CaseIntakeChat
    activeObjective: 'Active Case Objective',
    attachments: 'Attachments',
    composerPlaceholder: 'Type your message or ask questions...',
    send: 'Send',
    dragDropText: 'Drag & drop images/PDFs or click to upload',
    supportedFormats: 'Supported formats: PDF, PNG, JPG, JPEG, GIF',
    analyzing: 'Reconstructing case...',

    // RightCaseRecord (2 Tabs: Record | Gaps)
    record: 'Record',
    gaps: 'Gaps',
    timeline: 'Timeline',
    findings: 'Findings',
    evidence: 'Evidence',
    actions: 'Actions',
    emptyRecord: 'No record items reconstructed yet.',
    emptyTimeline: 'No timeline events reconstructed yet.',
    emptyClaims: 'No claims or findings evaluated yet.',
    emptyEvidence: 'No evidence artifacts registered yet.',
    emptyGaps: 'No missing evidence gaps identified.',
    emptyActions: 'No recommended next actions.',

    // Evidence Details & Modal
    evidenceDetail: 'Evidence Detail',
    inspectionResults: 'Inspection Results',
    sourceAttribution: 'Source Attribution',
    identifiersMatch: 'Identifiers Match',
    completenessContext: 'Completeness Context',
    integritySignals: 'Integrity Signals',
    limitations: 'Limitations',
    originalArtifact: 'Original Artifact',
    extractedFacts: 'Extracted Facts & content summary',
    claimedSource: 'Claimed Source',
    receivedAt: 'Received At',
    acquisitionMethod: 'Acquisition Method',
    fixityHash: 'Fixity Hash',
    download: 'Download',
    close: 'Close',

    // Export Modal
    exportCase: 'Export Case',
    downloadJson: 'Download JSON',
    downloadMarkdown: 'Download Markdown',
    copyClipboard: 'Copy to clipboard',
    copied: 'Copied!',
    exportHeading: 'Export Living Case Record',

    // States & Misc
    reported: 'Reported',
    corroborated: 'Corroborated',
    contested: 'Contested',
    establishedWithinRecord: 'Established within current record',
    mutuallyAcknowledged: 'Mutually acknowledged',
    epistemicWarningTitle: 'Epistemic Warning',
    noGapsWarning: 'All critical claims are documented. No pending evidence gaps identified.',
    targetGap: 'Target Gap',
    priority: 'Priority',
    supportedEvidence: 'Supporting Evidence',
    qualifyingEvidence: 'Qualifying Evidence',
    conflictingEvidence: 'Conflicting Evidence',
    unresolvedClaims: 'Unresolved Claims',
    establishedClaims: 'Established Claims',
    conflictedClaims: 'Contested Claims',
    totalEvidence: 'Total Evidence Items',
    userReportedClaims: 'Reported Claims',
  },
  vi: {
    newCase: 'Vụ việc mới',
    recentCases: 'Vụ việc gần đây',
    noActiveCases: 'Không có hồ sơ vụ việc nào hoạt động.',
    renameCase: 'Đổi tên vụ việc',
    deleteCase: 'Xóa vụ việc',
    caseNumber: 'Mã số vụ việc',
    caseName: 'Tên vụ việc',
    cancel: 'Hủy',
    saveChanges: 'Lưu thay đổi',
    delete: 'Xóa',
    archive: 'Lưu trữ',
    rename: 'Đổi tên',
    confirmDelete: 'Bạn có chắc chắn muốn xóa vụ việc',
    deleteWarning: 'Hành động này không thể hoàn tác. Tất cả các sự kiện dòng thời gian, tuyên bố và liên kết bằng chứng liên quan sẽ bị xóa vĩnh viễn khỏi phiên này.',
    deleteCaseBtn: 'Xóa vụ việc',

    activeObjective: 'Mục tiêu vụ việc hiện tại',
    attachments: 'Tệp đính kèm',
    composerPlaceholder: 'Nhập tin nhắn hoặc đặt câu hỏi...',
    send: 'Gửi',
    dragDropText: 'Kéo thả ảnh/PDF hoặc nhấp để tải lên',
    supportedFormats: 'Định dạng hỗ trợ: PDF, PNG, JPG, JPEG, GIF',
    analyzing: 'Đang tái dựng hồ sơ vụ việc...',

    record: 'Hồ sơ',
    gaps: 'Khoảng trống',
    timeline: 'Dòng thời gian',
    findings: 'Phát hiện',
    evidence: 'Bằng chứng',
    actions: 'Hành động',
    emptyRecord: 'Chưa có mục hồ sơ nào được tái dựng.',
    emptyTimeline: 'Chưa có sự kiện nào được tái dựng.',
    emptyClaims: 'Chưa có tuyên bố hoặc phát hiện nào được đánh giá.',
    emptyEvidence: 'Chưa có tài liệu bằng chứng nào được đăng ký.',
    emptyGaps: 'Chưa xác định được khoảng trống bằng chứng nào.',
    emptyActions: 'Chưa có đề xuất hành động tiếp theo.',

    evidenceDetail: 'Chi tiết bằng chứng',
    inspectionResults: 'Kết quả kiểm tra',
    sourceAttribution: 'Nguồn gốc tài liệu',
    identifiersMatch: 'Độ khớp định danh',
    completenessContext: 'Bối cảnh tính đầy đủ',
    integritySignals: 'Tín hiệu tính toàn vẹn',
    limitations: 'Giới hạn',
    originalArtifact: 'Tài liệu gốc',
    extractedFacts: 'Các sự thật trích xuất & tóm tắt nội dung',
    claimedSource: 'Nguồn tự tuyên bố',
    receivedAt: 'Nhận lúc',
    acquisitionMethod: 'Phương thức thu thập',
    fixityHash: 'Mã băm toàn vẹn',
    download: 'Tải về',
    close: 'Đóng',

    exportCase: 'Xuất vụ việc',
    downloadJson: 'Tải JSON',
    downloadMarkdown: 'Tải Markdown',
    copyClipboard: 'Sao chép vào bộ nhớ tạm',
    copied: 'Đã sao chép!',
    exportHeading: 'Xuất hồ sơ vụ việc sống',

    reported: 'Được báo cáo',
    corroborated: 'Được chứng thực',
    contested: 'Đang tranh chấp',
    establishedWithinRecord: 'Được xác lập trong hồ sơ hiện tại',
    mutuallyAcknowledged: 'Được đôi bên thừa nhận',
    epistemicWarningTitle: 'Cảnh báo nhận thức',
    noGapsWarning: 'Tất cả các tuyên bố quan trọng đã được chứng minh. Không phát hiện khoảng trống bằng chứng nào cần xử lý.',
    targetGap: 'Khoảng trống mục tiêu',
    priority: 'Độ ưu tiên',
    supportedEvidence: 'Bằng chứng hỗ trợ',
    qualifyingEvidence: 'Bằng chứng bổ sung',
    conflictingEvidence: 'Bằng chứng mâu thuẫn',
    unresolvedClaims: 'Tuyên bố chưa giải quyết',
    establishedClaims: 'Tuyên bố được xác lập',
    conflictedClaims: 'Tuyên bố tranh chấp',
    totalEvidence: 'Tổng số bằng chứng',
    userReportedClaims: 'Tuyên bố được báo cáo',
  },
  es: {
    newCase: 'Nuevo Caso',
    recentCases: 'Casos Recientes',
    noActiveCases: 'No hay registros de casos activos.',
    renameCase: 'Renombrar Caso',
    deleteCase: 'Eliminar Caso',
    caseNumber: 'Número de Caso',
    caseName: 'Nombre del Caso',
    cancel: 'Cancelar',
    saveChanges: 'Guardar Cambios',
    delete: 'Eliminar',
    archive: 'Archivar',
    rename: 'Renombrar',
    confirmDelete: '¿Está seguro de que desea eliminar el caso',
    deleteWarning: 'Esta acción no se puede deshacer. Todos los eventos de la línea de tiempo, reclamos y enlaces de evidencia asociados se eliminarán permanentemente de esta sesión.',
    deleteCaseBtn: 'Eliminar Caso',

    activeObjective: 'Objetivo del Caso Activo',
    attachments: 'Adjuntos',
    composerPlaceholder: 'Escriba su mensaje o haga preguntas...',
    send: 'Enviar',
    dragDropText: 'Arrastre y suelte imágenes/PDF o haga clic para subir',
    supportedFormats: 'Formatos soportados: PDF, PNG, JPG, JPEG, GIF',
    analyzing: 'Reconstruyendo caso...',

    record: 'Registro',
    gaps: 'Brechas',
    timeline: 'Línea de Tiempo',
    findings: 'Hallazgos',
    evidence: 'Evidencia',
    actions: 'Acciones',
    emptyRecord: 'Aún no se han reconstruido elementos en el registro.',
    emptyTimeline: 'Aún no se han reconstruido eventos en la línea de tiempo.',
    emptyClaims: 'Aún no se han evaluado reclamos o hallazgos.',
    emptyEvidence: 'Aún no se han registrado artefactos de evidencia.',
    emptyGaps: 'No se han identificado brechas de evidencia pendientes.',
    emptyActions: 'No hay acciones recomendadas a seguir.',

    evidenceDetail: 'Detalle de Evidencia',
    inspectionResults: 'Resultados de Inspección',
    sourceAttribution: 'Atribución de la Fuente',
    identifiersMatch: 'Coincidencia de Identificadores',
    completenessContext: 'Contexto de Completitud',
    integritySignals: 'Señales de Integridad',
    limitations: 'Limitaciones',
    originalArtifact: 'Artefacto Original',
    extractedFacts: 'Hechos extraídos y resumen de contenido',
    claimedSource: 'Fuente Reclamada',
    receivedAt: 'Recibido El',
    acquisitionMethod: 'Método de Adquisición',
    fixityHash: 'Hash de Integridad',
    download: 'Descargar',
    close: 'Cerrar',

    exportCase: 'Exportar Caso',
    downloadJson: 'Descargar JSON',
    downloadMarkdown: 'Descargar Markdown',
    copyClipboard: 'Copiar al portapapeles',
    copied: '¡Copiado!',
    exportHeading: 'Exportar Registro de Caso Vivo',

    reported: 'Reportado',
    corroborated: 'Corroborado',
    contested: 'En disputa',
    establishedWithinRecord: 'Establecido en el registro actual',
    mutuallyAcknowledged: 'Reconocido mutuamente',
    epistemicWarningTitle: 'Advertencia Epistémica',
    noGapsWarning: 'Todos los reclamos críticos están documentados. No se identifican brechas de evidencia pendientes.',
    targetGap: 'Brecha Objetivo',
    priority: 'Prioridad',
    supportedEvidence: 'Evidencia de Soporte',
    qualifyingEvidence: 'Evidencia de Calificación',
    conflictingEvidence: 'Evidencia en Conflicto',
    unresolvedClaims: 'Reclamos No Resueltos',
    establishedClaims: 'Reclamos Establecidos',
    conflictedClaims: 'Reclamos en Conflicto',
    totalEvidence: 'Total de Elementos de Evidencia',
    userReportedClaims: 'Reclamos Reportados',
  },
  fr: {
    newCase: 'Nouveau Dossier',
    recentCases: 'Dossiers Récents',
    noActiveCases: 'Aucun dossier actif.',
    renameCase: 'Renommer le Dossier',
    deleteCase: 'Supprimer le Dossier',
    caseNumber: 'Numéro de Dossier',
    caseName: 'Nom du Dossier',
    cancel: 'Annuler',
    saveChanges: 'Enregistrer',
    delete: 'Supprimer',
    archive: 'Archiver',
    rename: 'Renommer',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer le dossier',
    deleteWarning: 'Cette action est irréversible. Tous les événements de la chronologie, déclarations et liens de preuve associés seront définitivement supprimés de cette session.',
    deleteCaseBtn: 'Supprimer le Dossier',

    activeObjective: 'Objectif du Dossier Actif',
    attachments: 'Pièces Jointes',
    composerPlaceholder: 'Tapez votre message ou posez des questions...',
    send: 'Envoyer',
    dragDropText: 'Glissez-déposez des images/PDF ou cliquez pour charger',
    supportedFormats: 'Formats supportés : PDF, PNG, JPG, JPEG, GIF',
    analyzing: 'Reconstruction du dossier...',

    record: 'Dossier',
    gaps: 'Lacunes',
    timeline: 'Chronologie',
    findings: 'Conclusions',
    evidence: 'Preuves',
    actions: 'Actions',
    emptyRecord: 'Aucun élément reconstruit pour le moment.',
    emptyTimeline: 'Aucun événement chronologique reconstruit pour le moment.',
    emptyClaims: 'Aucune déclaration ou conclusion évaluée pour le moment.',
    emptyEvidence: 'Aucun élément de preuve enregistré pour le moment.',
    emptyGaps: 'Aucune lacune de preuve identifiée.',
    emptyActions: 'Aucune action recommandée.',

    evidenceDetail: 'Détail de la Preuve',
    inspectionResults: 'Résultats de l\'Inspection',
    sourceAttribution: 'Attribution de la Source',
    identifiersMatch: 'Correspondance des Identifiants',
    completenessContext: 'Contexte de Complétude',
    integritySignals: 'Signaux d\'Intégrité',
    limitations: 'Limites',
    originalArtifact: 'Artefact Original',
    extractedFacts: 'Faits extraits & résumé du contenu',
    claimedSource: 'Source Déclarée',
    receivedAt: 'Reçu Le',
    acquisitionMethod: 'Méthode d\'Acquisition',
    fixityHash: 'Hash d\'Intégrité',
    download: 'Télécharger',
    close: 'Fermer',

    exportCase: 'Exporter le Dossier',
    downloadJson: 'Télécharger le JSON',
    downloadMarkdown: 'Télécharger le Markdown',
    copyClipboard: 'Copier dans le presse-papiers',
    copied: 'Copié !',
    exportHeading: 'Exporter le Dossier Actif',

    reported: 'Signalé',
    corroborated: 'Corroboré',
    contested: 'Contesté',
    establishedWithinRecord: 'Établi dans le dossier actuel',
    mutuallyAcknowledged: 'Mutuellement reconnu',
    epistemicWarningTitle: 'Avertissement Épistémique',
    noGapsWarning: 'Toutes les déclarations critiques sont documentées. Aucune lacune de preuve identifiée.',
    targetGap: 'Lacune Cible',
    priority: 'Priorité',
    supportedEvidence: 'Preuves à l\'Appui',
    qualifyingEvidence: 'Preuves Qualifiantes',
    conflictingEvidence: 'Preuves Contradictoires',
    unresolvedClaims: 'Déclarations Non Résolues',
    establishedClaims: 'Déclarations Établies',
    conflictedClaims: 'Déclarations Contestées',
    totalEvidence: 'Total des Éléments de Preuve',
    userReportedClaims: 'Déclarations Signalées',
  },
  'zh-CN': {
    newCase: '新案件',
    recentCases: '最近案件',
    noActiveCases: '没有活跃的案件记录。',
    renameCase: '重命名案件',
    deleteCase: '删除案件',
    caseNumber: '案件编号',
    caseName: '案件名称',
    cancel: '取消',
    saveChanges: '保存更改',
    delete: '删除',
    archive: '归档',
    rename: '重命名',
    confirmDelete: '您确定要删除案件吗',
    deleteWarning: '此操作无法撤销。所有关联的时间线事件、主张和证据链接都将从本次会话中永久删除。',
    deleteCaseBtn: '删除案件',

    activeObjective: '当前案件目标',
    attachments: '附件',
    composerPlaceholder: '输入消息或提出问题...',
    send: '发送',
    dragDropText: '拖放图片/PDF或点击上传',
    supportedFormats: '支持格式：PDF, PNG, JPG, JPEG, GIF',
    analyzing: '正在重建案件记录...',

    record: '记录',
    gaps: '缺口',
    timeline: '时间线',
    findings: '发现',
    evidence: '证据',
    actions: '行动',
    emptyRecord: '尚未重建任何记录项。',
    emptyTimeline: '尚未重建时间线事件。',
    emptyClaims: '尚未评估任何主张或发现。',
    emptyEvidence: '尚未登记任何证据文件。',
    emptyGaps: '未发现待解决的证据缺口。',
    emptyActions: '暂无推荐行动。',

    evidenceDetail: '证据详情',
    inspectionResults: '检查结果',
    sourceAttribution: '来源归属',
    identifiersMatch: '标识符匹配',
    completenessContext: '完整性背景',
    integritySignals: '完整性信号',
    limitations: '局限性',
    originalArtifact: '原始文件',
    extractedFacts: '提取的事实与内容摘要',
    claimedSource: '自称来源',
    receivedAt: '接收时间',
    acquisitionMethod: '获取方式',
    fixityHash: '完整性哈希',
    download: '下载',
    close: '关闭',

    exportCase: '导出案件',
    downloadJson: '下载 JSON',
    downloadMarkdown: '下载 Markdown',
    copyClipboard: '复制到剪贴板',
    copied: '已复制！',
    exportHeading: '导出活动案件记录',

    reported: '已报告',
    corroborated: '已证实',
    contested: '有争议',
    establishedWithinRecord: '当前记录中已确立',
    mutuallyAcknowledged: '双方共同认可',
    epistemicWarningTitle: '认知警告',
    noGapsWarning: '所有关键主张均已记录。未发现待解决的证据缺口。',
    targetGap: '目标缺口',
    priority: '优先级',
    supportedEvidence: '支持性证据',
    qualifyingEvidence: '限定性证据',
    conflictingEvidence: '冲突性证据',
    unresolvedClaims: '未解决的主张',
    establishedClaims: '确立的主张',
    conflictedClaims: '争议主张',
    totalEvidence: '证据项总数',
    userReportedClaims: '报告的主张',
  },
  ja: {
    newCase: '新規案件',
    recentCases: '最近の案件',
    noActiveCases: 'アクティブな案件記録はありません。',
    renameCase: '案件名の変更',
    deleteCase: '案件の削除',
    caseNumber: '案件番号',
    caseName: '案件名',
    cancel: 'キャンセル',
    saveChanges: '変更を保存',
    delete: '削除',
    archive: 'アーカイブ',
    rename: '名前変更',
    confirmDelete: '本当に案件を削除しますか',
    deleteWarning: 'この操作は取り消せません。関連するすべてのタイムラインイベント、主張、および証拠リンクがこのセッションから永久に削除されます。',
    deleteCaseBtn: '案件を削除',

    activeObjective: '現在の案件目標',
    attachments: '添付ファイル',
    composerPlaceholder: 'メッセージを入力するか、質問してください...',
    send: '送信',
    dragDropText: '画像/PDFをドラッグ＆ドロップ、またはクリックしてアップロード',
    supportedFormats: '対応フォーマット: PDF, PNG, JPG, JPEG, GIF',
    analyzing: '案件を再構築中...',

    record: '記録',
    gaps: 'ギャップ',
    timeline: 'タイムライン',
    findings: '評価・主言',
    evidence: '証拠',
    actions: '推奨アクション',
    emptyRecord: '再構築された記録項目はありません。',
    emptyTimeline: '再構築されたタイムラインイベントはありません。',
    emptyClaims: '評価された主張や発見事項はありません。',
    emptyEvidence: '登録された証拠資料はありません。',
    emptyGaps: '特定された証拠ギャップはありません。',
    emptyActions: '推奨される次のアクションはありません。',

    evidenceDetail: '証拠の詳細',
    inspectionResults: '検証結果',
    sourceAttribution: '情報源の帰属',
    identifiersMatch: '識別子の一致',
    completenessContext: '網羅性の文脈',
    integritySignals: '完全性のシグナル',
    limitations: '限界事項',
    originalArtifact: 'オリジナル資料',
    extractedFacts: '抽出された事実と内容の要約',
    claimedSource: '主張された情報源',
    receivedAt: '受領日時',
    acquisitionMethod: '取得方法',
    fixityHash: '整合性ハッシュ',
    download: 'ダウンロード',
    close: '閉じる',

    exportCase: '案件の書き出し',
    downloadJson: 'JSONをダウンロード',
    downloadMarkdown: 'Markdownをダウンロード',
    copyClipboard: 'クリップボードにコピー',
    copied: 'コピーしました！',
    exportHeading: '進行中案件記録の書き出し',

    reported: '報告済み',
    corroborated: '裏付け済み',
    contested: '係争中',
    establishedWithinRecord: '現行記録上確立',
    mutuallyAcknowledged: '相互承認済み',
    epistemicWarningTitle: '認識論的警告',
    noGapsWarning: 'すべての重要な主張が文書化されています。特定された未解決の証拠ギャップはありません。',
    targetGap: '対象ギャップ',
    priority: '優先度',
    supportedEvidence: '裏付け証拠',
    qualifyingEvidence: '限定証拠',
    conflictingEvidence: '矛盾する証拠',
    unresolvedClaims: '未解決の主張',
    establishedClaims: '確立された主張',
    conflictedClaims: '係争中の主張',
    totalEvidence: '証拠アイテム総数',
    userReportedClaims: '報告された主張',
  },
};

// Translates internal canonical AssessmentStateEnum values to UI locale representation
export function translateAssessment(val: string, locale: Locale): string {
  if (locale === 'en') return val;
  const t = translations[locale];
  switch (val) {
    case 'Established within current record':
      return t.establishedWithinRecord || 'Established within current record';
    case 'Reported':
      return t.reported || 'Reported';
    case 'Corroborated':
      return t.corroborated || 'Corroborated';
    case 'Contested':
      return t.contested || 'Contested';
    case 'Mutually acknowledged':
      return t.mutuallyAcknowledged || 'Mutually acknowledged';
    default:
      return val;
  }
}

// Translates CausalRelationshipEnum
export function translateCausal(val: string, locale: Locale): string {
  switch (val) {
    case 'established':
      return locale === 'vi' ? 'Đã xác lập' :
             locale === 'es' ? 'Establecido' :
             locale === 'fr' ? 'Établi' :
             locale === 'zh-CN' ? '确立' :
             locale === 'ja' ? '確立' : 'Established';
    case 'unresolved':
      return locale === 'vi' ? 'Chưa giải quyết' :
             locale === 'es' ? 'No resuelto' :
             locale === 'fr' ? 'Non résolu' :
             locale === 'zh-CN' ? '未解决' :
             locale === 'ja' ? '未解決' : 'Unresolved';
    case 'not_supported':
      return locale === 'vi' ? 'Không được hỗ trợ' :
             locale === 'es' ? 'No soportado' :
             locale === 'fr' ? 'Non supporté' :
             locale === 'zh-CN' ? '不支持' :
             locale === 'ja' ? '非サポート' : 'Not supported';
    case 'none':
    default:
      return locale === 'vi' ? 'Không' :
             locale === 'es' ? 'Ninguno' :
             locale === 'fr' ? 'Aucun' :
             locale === 'zh-CN' ? '无' :
             locale === 'ja' ? 'なし' : 'None';
  }
}

// Translates PriorityEnum
export function translatePriority(val: string, locale: Locale): string {
  switch (val) {
    case 'high':
      return locale === 'vi' ? 'Cao' :
             locale === 'es' ? 'Alta' :
             locale === 'fr' ? 'Haute' :
             locale === 'zh-CN' ? '高' :
             locale === 'ja' ? '高' : 'High';
    case 'low':
      return locale === 'vi' ? 'Thấp' :
             locale === 'es' ? 'Baja' :
             locale === 'fr' ? 'Basse' :
             locale === 'zh-CN' ? '低' :
             locale === 'ja' ? '低' : 'Low';
    case 'medium':
    default:
      return locale === 'vi' ? 'Trung bình' :
             locale === 'es' ? 'Media' :
             locale === 'fr' ? 'Moyenne' :
             locale === 'zh-CN' ? '中' :
             locale === 'ja' ? '中' : 'Medium';
  }
}

// Translates MatchStatusEnum
export function translateMatchStatus(val: string, locale: Locale): string {
  switch (val) {
    case 'matched':
      return locale === 'vi' ? 'Khớp' :
             locale === 'es' ? 'Coincide' :
             locale === 'fr' ? 'Correspondant' :
             locale === 'zh-CN' ? '匹配' :
             locale === 'ja' ? '一致' : 'Matched';
    case 'mismatched':
      return locale === 'vi' ? 'Không khớp' :
             locale === 'es' ? 'No coincide' :
             locale === 'fr' ? 'Non correspondant' :
             locale === 'zh-CN' ? '不匹配' :
             locale === 'ja' ? '不一致' : 'Mismatched';
    case 'unclear':
      return locale === 'vi' ? 'Chưa rõ' :
             locale === 'es' ? 'Poco claro' :
             locale === 'fr' ? 'Pas clair' :
             locale === 'zh-CN' ? '不明确' :
             locale === 'ja' ? '不明瞭' : 'Unclear';
    case 'not_assessed':
    default:
      return locale === 'vi' ? 'Chưa đánh giá' :
             locale === 'es' ? 'No evaluado' :
             locale === 'fr' ? 'Non évalué' :
             locale === 'zh-CN' ? '未评估' :
             locale === 'ja' ? '未評価' : 'Not assessed';
  }
}
