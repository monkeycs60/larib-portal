"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type PdfViewerProps = {
	pdfUrl: string
	isAdmin: boolean
	className?: string
}

export default function PdfViewer({ pdfUrl, isAdmin, className }: PdfViewerProps) {
	const [numPages, setNumPages] = useState<number>(0)
	const [zoom, setZoom] = useState(1.0)

	const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`

	const handleContextMenu = (event: React.MouseEvent) => {
		if (!isAdmin) {
			event.preventDefault()
			return false
		}
	}

	const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0))
	const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))

	if (isAdmin) {
		return (
			<div className={cn("relative overflow-hidden", className)}>
				<iframe
					src={proxyUrl}
					className="w-full h-full"
					style={{
						border: 'none',
						minHeight: '70vh',
					}}
				/>
			</div>
		)
	}

	return (
		<div
			className={cn("relative overflow-hidden", className)}
			onContextMenu={handleContextMenu}
			style={{ userSelect: 'none' }}
		>
			<div className="absolute top-2 right-2 z-20 flex items-center gap-2 bg-white border rounded-md shadow-sm p-1">
				<Button
					size="sm"
					variant="ghost"
					onClick={zoomOut}
					disabled={zoom <= 0.5}
					className="h-8 w-8 p-0"
				>
					<ZoomOut className="h-4 w-4" />
				</Button>
				<span className="text-sm font-medium min-w-[3rem] text-center">
					{Math.round(zoom * 100)}%
				</span>
				<Button
					size="sm"
					variant="ghost"
					onClick={zoomIn}
					disabled={zoom >= 3.0}
					className="h-8 w-8 p-0"
				>
					<ZoomIn className="h-4 w-4" />
				</Button>
			</div>
			<div className="overflow-auto h-full w-full">
				<Document
					file={proxyUrl}
					onLoadSuccess={({ numPages }) => setNumPages(numPages)}
					className="flex flex-col items-center gap-4 py-4"
				>
					{Array.from(new Array(numPages), (_el, index) => (
						<Page
							key={`page_${index + 1}`}
							pageNumber={index + 1}
							scale={zoom}
							renderTextLayer={false}
							renderAnnotationLayer={false}
							className="shadow-lg"
						/>
					))}
				</Document>
			</div>
		</div>
	)
}
