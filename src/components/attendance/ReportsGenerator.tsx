import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from 'xlsx'

interface ReportProps {
    data: any[]
    filename: string
    sheetName?: string
    buttonLabel?: string
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function ReportsGenerator({ data, filename, sheetName = "Sheet1", buttonLabel = "Export to Excel", variant = "outline" }: ReportProps) {
    const handleDownload = () => {
        if (!data || data.length === 0) {
            alert("No data available to export.")
            return
        }

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        
        // Auto-sizing columns based on content length
        const maxWidths = Object.keys(data[0]).map(k => ({ wch: k.length + 5 }))
        data.forEach(row => {
            Object.values(row).forEach((val, i) => {
                const len = val ? val.toString().length : 0
                if (len > maxWidths[i].wch) maxWidths[i].wch = len + 2
            })
        })
        worksheet['!cols'] = maxWidths

        XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <Button variant={variant} onClick={handleDownload} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            {buttonLabel}
        </Button>
    )
}
