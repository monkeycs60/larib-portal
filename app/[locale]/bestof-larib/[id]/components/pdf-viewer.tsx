"use client"

import { cn } from "@/lib/utils"

type PdfViewerProps = {
	pdfUrl: string
	isAdmin: boolean
	className?: string
}

export default function PdfViewer({ pdfUrl, isAdmin, className }: PdfViewerProps) {
	const displayUrl = isAdmin ? pdfUrl : `${pdfUrl}#toolbar=0`

	const handleContextMenu = (event: React.MouseEvent) => {
		if (!isAdmin) {
			event.preventDefault()
		}
	}

	return (
		<div
			className={cn("relative overflow-hidden", className)}
			onContextMenu={handleContextMenu}
		>
			<iframe
				src={displayUrl}
				className="w-full h-full"
				style={{
					border: 'none',
					...(isAdmin ? {} : {
						pointerEvents: 'auto',
					})
				}}
			/>
			{!isAdmin && (
				<style jsx>{`
					iframe::-webkit-scrollbar {
						display: none;
					}
				`}</style>
			)}
		</div>
	)
}
