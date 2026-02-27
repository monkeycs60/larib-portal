# Training Best-of — DICOM Download Feature

## Context

Training Best-of allows students to complete radiology reports on clinical cases. Currently, cases contain PDFs or text but no DICOM imaging files. Students need to download DICOMs to view them in external software (Horos, OsiriX, etc.).

DICOMs (~100 GB for ~300 cases, ~333 MB average per case) already exist and need to be imported onto the OVH FTP server, then made downloadable from the platform.

## Storage Structure

DICOMs are stored on the OVH server at `/data/miracl/bestof/`, organized by modality then case number:

```
/data/miracl/bestof/
├── MRI/
│   ├── 0001/
│   │   ├── file_001.dcm
│   │   └── ...
│   ├── 0002/
│   │   └── ...
│   └── 0015/
│       └── ...
├── CT/
│   ├── 0003/
│   │   └── ...
│   └── 0008/
│       └── ...
└── Echo/
    ├── 0004/
    │   └── ...
    └── 0010/
        └── ...
```

### Conventions

- **Modality folders** (`MRI`, `CT`, `Echo`) match `ExamType.name` in the database
- **Case folders** use 4-digit zero-padded numbering (`0001`-`9999`)
- **Numbering is global** — unique across all modalities (case 0042 is case 0042 regardless of modality)
- Inside each case folder: flat DICOM files, structure libre
- **Import method**: admin uploads via FTPS or SSH directly to the server

### Linking DICOMs to Cases

The DICOM path is derived from two fields on `ClinicalCase`:

- `ExamType.name` → modality folder
- `caseNumber` (new field) → case folder

Path formula: `/data/miracl/bestof/{ExamType.name}/{caseNumber zero-padded to 4 digits}/`

## Database Changes

### ClinicalCase model

Add one field:

```prisma
model ClinicalCase {
  // ... existing fields
  caseNumber  Int     @unique @default(autoincrement())
}
```

- Auto-incremented, unique across all cases
- Assigned automatically at creation
- Admin can see it in the create/edit dialog (read-only by default, editable if needed)

## API Endpoints

All endpoints require authentication. Connection to OVH server via SSH/SFTP (`ssh2-sftp-client`).

### 1. Check DICOM availability (admin)

```
GET /api/bestof/dicoms/check?caseId=xxx
```

Response:
```json
{
  "exists": true,
  "fileCount": 47,
  "totalSizeMB": 312
}
```

Used for the green/red indicator in the admin cases list.

### 2. Download single case DICOMs

```
GET /api/bestof/dicoms/download?caseId=xxx
```

- Reads files from SFTP
- Creates zip on-the-fly (streaming with `archiver`, no temp files)
- Returns: `Cas_0042_MRI.zip`

### 3. Download batch (multiple cases)

```
POST /api/bestof/dicoms/download-batch
```

Body:
```json
{
  "caseIds": ["id1", "id2", "id3"]
}
```

- Maximum 50 cases per request
- Streaming zip containing one subfolder per case
- Structure:
  ```
  batch_download.zip
  ├── 0001_MRI/
  │   ├── file_001.dcm
  │   └── ...
  ├── 0015_MRI/
  │   └── ...
  └── 0042_CT/
      └── ...
  ```

## UI Changes

### Cases list page (students)

- **Checkbox column** on the left of each row
- **DICOM indicator** icon per row (available / not available). Cases without DICOMs have disabled checkboxes.
- **Floating action bar** appears when >= 1 case is checked:
  - Shows: selected count + estimated total size
  - "Download DICOMs (X cases)" button
  - "Select all" / "Deselect all"
  - Disabled state + message if > 50 cases selected

### Case detail page (students)

- **"Download DICOMs" button** in the case header
- Hidden/disabled if no DICOMs available
- Shows estimated size on hover

### Cases list page (admin)

- **Colored badge** per case:
  - Green: DICOMs present (hover shows file count)
  - Red: folder missing or empty
- **Create/edit dialog**: displays `caseNumber` (auto-filled with next available number). Helper text shows the expected FTP path: `bestof/{ExamType}/{caseNumber}/`

## Technical Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Connection protocol | SSH/SFTP (not FTP) | Simpler in Node.js, SSH access already available |
| SFTP library | `ssh2-sftp-client` | Well-maintained, promise-based, streaming support |
| Zip creation | `archiver` (streaming) | No temp files, streams directly to HTTP response |
| Download format | .zip | Universal, simple, works everywhere |
| Batch limit | 50 cases | ~16 GB max, reasonable for streaming |
| Case numbering | 4 digits, global auto-increment | Unique across modalities, supports up to 9999 cases |

## Environment Variables (new)

```env
SFTP_HOST=152.228.221.137
SFTP_PORT=22
SFTP_USERNAME=solenn
SFTP_PRIVATE_KEY_PATH=/path/to/key  # or SFTP_PASSWORD
BESTOF_DICOMS_BASE_PATH=/data/miracl/bestof
```

## Future Considerations

- Multi-modality per case (same patient with MRI + Echo) — current structure supports it naturally by querying multiple modality folders for the same case number
- DICOM viewer in browser (Cornerstone.js / OHIF) — could be added later, storage structure is compatible
- More than 9999 cases — switch to 5+ digit padding if needed
