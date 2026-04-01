import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, ShieldCheck, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateAssetIntake, uploadAssetDocument } from '../../services/api'
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions'

const INTAKE_PHASES = [
  {
    phase: 'Physical Verification',
    icon: 'Box',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    requiredRoles: ['admin', 'it'],
    items: [
      { field: 'physical_inspect_done', label: 'Physical inspection completed', required: true },
      { field: 'box_contents_verified', label: 'Box contents verified against invoice', required: true },
      { field: 'serial_number_verified', label: 'Serial number matches invoice', required: true },
    ],
  },
  {
    phase: 'Asset Tagging',
    icon: 'Tag',
    color: 'var(--accent)',
    bg: 'rgba(79,142,247,0.12)',
    requiredRoles: ['admin', 'it'],
    items: [
      { field: 'asset_tag_affixed', label: 'Asset tag affixed to device', required: true },
    ],
  },
  {
    phase: 'IT Configuration',
    icon: 'Device',
    color: 'var(--teal)',
    bg: 'rgba(34,197,94,0.10)',
    requiredRoles: ['admin', 'it'],
    assetTypes: ['Laptop', 'Desktop'],
    items: [
      { field: 'os_installed', label: 'OS installed and activated', required: true },
      { field: 'domain_joined', label: 'Joined to company domain', required: true },
      { field: 'antivirus_installed', label: 'Antivirus or EDR installed', required: true },
      { field: 'software_baseline_done', label: 'Software baseline applied', required: true },
      { field: 'bitlocker_enabled', label: 'Disk encryption enabled', required: false },
      { field: 'bios_password_set', label: 'BIOS password set', required: false },
      { field: 'data_wiped_prev_user', label: 'Previous user data wiped', required: false },
    ],
  },
  {
    phase: 'Documentation',
    icon: 'Docs',
    color: 'var(--accent)',
    bg: 'rgba(99,102,241,0.10)',
    requiredRoles: ['admin', 'it', 'hr'],
    items: [
      { field: 'invoice_uploaded', label: 'Purchase invoice uploaded', required: true },
      { field: 'warranty_card_uploaded', label: 'Warranty card uploaded', required: true },
      { field: 'alloc_form_generated', label: 'Allocation form generated', required: true },
      { field: 'alloc_form_signed', label: 'Allocation form signed', required: true },
    ],
  },
  {
    phase: 'Finance Registration',
    icon: 'Money',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    requiredRoles: ['admin', 'finance'],
    items: [
      { field: 'asset_registered_finance', label: 'Asset registered in finance system', required: true },
      { field: 'depreciation_entry_done', label: 'Depreciation entry completed', required: false },
    ],
  },
]

function ChecklistItem({ item, value, canEdit, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && onToggle(item.field, !value)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: canEdit ? 'pointer' : 'default',
          color: value ? 'var(--green)' : 'var(--border2)',
          opacity: canEdit ? 1 : 0.6,
        }}
      >
        {value ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} />}
      </button>
      <div style={{ flex: 1, fontSize: 13, color: value ? 'var(--text3)' : 'var(--text)', textDecoration: value ? 'line-through' : 'none' }}>
        {item.label}
        {item.required && !value && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </div>
    </div>
  )
}

function UploadDocButton({ assetId, category, label, onUploaded }) {
  const [loading, setLoading] = useState(false)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', label)
      formData.append('category', category)
      await uploadAssetDocument(assetId, formData)
      toast.success(`${label} uploaded`)
      onUploaded?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  return (
    <label style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      background: 'var(--bg4)',
      border: '1px solid var(--border2)',
      fontSize: 12,
      color: 'var(--text2)',
    }}>
      <Upload size={12} />
      {loading ? 'Uploading...' : `Upload ${label}`}
      <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFile} disabled={loading} />
    </label>
  )
}

export default function AssetIntakeChecklist({ asset, onIntakeComplete }) {
  const { can, role } = usePermissions()
  const [checklist, setChecklist] = useState(asset.intake_checklist || {})
  const [saving, setSaving] = useState(false)
  const canEditAsset = can(PERMISSIONS.ASSET_EDIT)

  useEffect(() => {
    setChecklist(asset.intake_checklist || {})
  }, [asset.id, asset.intake_checklist])

  const progress = useMemo(() => {
    const visibleItems = INTAKE_PHASES.flatMap((phase) => {
      if (phase.assetTypes && !phase.assetTypes.includes(asset.asset_type)) return []
      return phase.items
    })
    if (!visibleItems.length) return 0
    const completed = visibleItems.filter((item) => checklist[item.field]).length
    return Math.round((completed / visibleItems.length) * 100)
  }, [asset.asset_type, checklist])

  const handleToggle = async (field, value) => {
    const phase = INTAKE_PHASES.find((item) => item.items.some((phaseItem) => phaseItem.field === field))
    const phaseCanEdit = Boolean(phase && phase.requiredRoles.includes(role) && (canEditAsset || role === 'finance'))
    if (!phaseCanEdit) return
    setSaving(true)
    try {
      const res = await updateAssetIntake(asset.id, { [field]: value })
      setChecklist(res.data?.checklist || ((prev) => ({ ...prev, [field]: value })))
      if (field === 'ready_to_assign' && value) {
        onIntakeComplete?.()
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update intake')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Asset Intake Checklist</span>
            {saving && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Saving...</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? 'var(--green)' : 'var(--amber)' }}>
            {progress === 100 ? 'Complete' : `${progress}% Complete`}
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'var(--accent)', transition: 'width 0.25s ease' }} />
        </div>
        {!canEditAsset && role !== 'finance' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>
            <AlertTriangle size={12} />
            View only: your role cannot update intake items.
          </div>
        )}
      </div>

      {INTAKE_PHASES.map((phase) => {
        if (phase.assetTypes && !phase.assetTypes.includes(asset.asset_type)) return null

        const phaseDone = phase.items.filter((item) => checklist[item.field]).length
        const phaseCanEdit = phase.requiredRoles.includes(role) && (canEditAsset || role === 'finance')

        return (
          <div key={phase.phase} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: phase.color, background: phase.bg }}>
                  {phase.phase}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {phaseDone}/{phase.items.length}
              </div>
            </div>

            {phase.items.map((item) => (
              <ChecklistItem
                key={item.field}
                item={item}
                value={Boolean(checklist[item.field])}
                canEdit={phaseCanEdit}
                onToggle={handleToggle}
              />
            ))}

            {phase.phase === 'Documentation' && phaseCanEdit && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <UploadDocButton assetId={asset.id} category="invoice" label="Invoice" onUploaded={() => setChecklist((prev) => ({ ...prev, invoice_uploaded: true }))} />
                <UploadDocButton assetId={asset.id} category="warranty" label="Warranty Card" onUploaded={() => setChecklist((prev) => ({ ...prev, warranty_card_uploaded: true }))} />
                <UploadDocButton assetId={asset.id} category="allocation" label="Allocation Form" onUploaded={() => setChecklist((prev) => ({ ...prev, alloc_form_signed: true }))} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
