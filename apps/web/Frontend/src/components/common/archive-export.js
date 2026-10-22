import theme from '../../../tailwind.config.js'
import logoUrl from '../../assets/ironclad_lightmode.png'

const source = 'IronClad | University of Caloocan City, Congressional Campus'
const cell = value => `"${String(value ?? '').replace(/^\s*([=+@-])/, "'$&").replaceAll('"', '""')}"`
export function archiveCsv(records, fileName) {
  const columns = ['Source', 'Reference', 'Event', 'Organizer', 'Date', 'Venue', 'Course / Section', 'Category', 'Start time', 'End time']
  const lines = records.map(r => [source, r.permitNo, r.title, r.organizer, r.concludedDate, r.venue?.label, r.courseSection, r.category, r.startTime, r.endTime].map(cell).join(','))
  return { fileName: `${fileName}.csv`, blob: new Blob(['\uFEFF', columns.map(cell).join(','), '\r\n', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }) }
}

const encode = value => new TextEncoder().encode(value)
const concat = arrays => { const result = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0)); let offset = 0; arrays.forEach(a => { result.set(a, offset); offset += a.length }); return result }

// Dependency-free PDF container. Each high-resolution page embeds the branded canvas.
export function pdfDocument(pages) {
  const objects = []
  const add = bytes => { objects.push(typeof bytes === 'string' ? encode(bytes) : bytes); return objects.length }
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`)
  for (const page of pages) {
    const pageId = objects.length + 1
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage ${pageId + 1} 0 R >> >> /Contents ${pageId + 2} 0 R >>`)
    add(concat([encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`), page.bytes, encode('\nendstream')]))
    const stream = 'q 595.28 0 0 841.89 0 0 cm /PageImage Do Q\n'
    add(`<< /Length ${encode(stream).length} >>\nstream\n${stream}endstream`)
  }
  const infoId = add('<< /Title (IronClad - Campus Archive) /Author (IronClad) /Subject (Campus event archive records) /Creator (IronClad Archive) >>')
  const chunks = [encode('%PDF-1.4\n%IronClad\n')]
  const offsets = [0]
  let length = chunks[0].length
  objects.forEach((object, i) => { offsets.push(length); const chunk = concat([encode(`${i + 1} 0 obj\n`), object, encode('\nendobj\n')]); chunks.push(chunk); length += chunk.length })
  const xref = length
  chunks.push(encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF`))
  return new Blob(chunks, { type: 'application/pdf' })
}

export async function archivePdf(records, fileName) {
  await document.fonts.ready
  const logo = new Image()
  logo.src = logoUrl
  await logo.decode()
  const color = token => theme.theme.extend.colors[token]
  const pages = []
  const perPage = 3
  const totalPages = Math.max(1, Math.ceil(records.length / perPage))
  for (let number = 0; number < totalPages; number++) {
    const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('PDF rendering is unavailable in this browser. Try CSV instead.')
    const text = (value, x, y, size = 22, bold = false, token = 'textPrimary') => { ctx.fillStyle = color(token); ctx.font = `${bold ? 600 : 400} ${size}px Poppins, sans-serif`; ctx.fillText(String(value ?? ''), x, y) }
    const wrap = (value, x, y, width, size = 25, lineHeight = 36, bold = false) => {
      ctx.font = `${bold ? 600 : 400} ${size}px Poppins, sans-serif`
      const words = String(value ?? '').split(/\s+/); let line = ''; let baseline = y
      for (const word of words) { const parts = []; let part = ''; for (const char of word) { if (ctx.measureText(part + char).width > width) { parts.push(part); part = '' }; part += char }; parts.push(part)
        for (const fragment of parts) { const test = line ? `${line} ${fragment}` : fragment; if (ctx.measureText(test).width > width && line) { text(line, x, baseline, size, bold); baseline += lineHeight; line = fragment } else line = test }
      }
      if (line) text(line, x, baseline, size, bold)
      return baseline + lineHeight
    }
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1240, 1754)
    ctx.fillStyle = color('navbar'); ctx.fillRect(0, 0, 1240, 210)
    ctx.fillStyle = 'white'; ctx.fillRect(62, 56, 90, 90)
    ctx.drawImage(logo, 62, 56, 90, 90)
    text('IronClad', 180, 100, 40, true, 'cardBg'); text('CAMPUS ARCHIVE', 180, 142, 22, true, 'navMuted')
    text('University of Caloocan City · Congressional Campus', 62, 185, 20, false, 'cardBg')
    text('Concluded campus events', 62, 280, 38, true, 'deep')
    text(`${records.length} ${records.length === 1 ? 'record' : 'records'} · Exported ${new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date())}`, 62, 324, 21, false, 'textSecondary')
    records.slice(number * perPage, (number + 1) * perPage).forEach((record, index) => {
      const top = 370 + index * 400
      ctx.fillStyle = color(index % 2 ? 'pageBg' : 'cardBg'); ctx.fillRect(62, top, 1116, 374)
      text(record.permitNo || 'Event record', 86, top + 37, 20, true, 'dark')
      let y = wrap(record.title, 86, top + 80, 1068, 27, 35, true)
      y = wrap(`Organizer: ${record.organizer || '—'}`, 86, y + 3, 1068, 19, 27)
      y = wrap(`${record.concludedDate}  ·  ${record.startTime || ''} - ${record.endTime || ''}  ·  ${record.venue?.label || 'Campus venue'}`, 86, y + 3, 1068, 19, 27)
      wrap(`${record.courseSection || ''}  ·  ${record.category || 'Campus event'}  ·  ${record.academicYear || ''} ${record.semester || ''}`, 86, y + 3, 1068, 19, 27)
    })
    ctx.fillStyle = color('footerBg'); ctx.fillRect(0, 1630, 1240, 124)
    text('IronClad · Campus records', 62, 1681, 21, true, 'deep'); text(`Page ${number + 1} of ${totalPages}`, 1015, 1681, 20, false, 'deep')
    text('Generated from your current archive selection.', 62, 1718, 17, false, 'textSecondary')
    const binary = atob(canvas.toDataURL('image/jpeg', 0.96).split(',')[1])
    pages.push({ width: canvas.width, height: canvas.height, bytes: Uint8Array.from(binary, char => char.charCodeAt(0)) })
  }
  return { fileName: `${fileName}.pdf`, blob: pdfDocument(pages) }
}

export const exportArchiveFile = (records, fileName, format = 'pdf') => format === 'csv' ? archiveCsv(records, fileName) : format === 'pdf' ? archivePdf(records, fileName) : Promise.reject(new Error('Choose PDF or CSV.'))
