'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

type Props = {
	accept: string;
	maxSize: number;
	valueUrl?: string | null;
	onUploaded: (res: { url: string; key: string }) => void;
	disabled?: boolean;
};

export function FileUpload({
	accept,
	maxSize,
	valueUrl,
	onUploaded,
	disabled,
}: Props) {
	const t = useTranslations('upload');
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const currentUrl = valueUrl ?? null;

	function onPick() {
		inputRef.current?.click();
	}

	function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		if (!f.type.startsWith('image/')) {
			alert(t('invalidType'));
			return;
		}
		if (f.size > maxSize) {
			alert(t('fileTooLarge'));
			return;
		}
		setFile(f);
		const url = URL.createObjectURL(f);
		setPreview(url);
	}

	async function doUpload() {
		if (!file) return;
		setUploading(true);
		try {
			type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
			const allowed: ReadonlyArray<AllowedMime> = [
				'image/jpeg',
				'image/png',
				'image/webp',
				'image/gif',
			];
			if (!allowed.includes(file.type as AllowedMime)) throw new Error('invalid_type');

			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/uploads/avatar', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload_failed');
			const data = (await res.json()) as { url: string; key: string };
			// Persist immediately server-side so refresh keeps the avatar
			const { saveProfilePhotoAction } = await import('@/actions/avatar');
			const saveRes = await saveProfilePhotoAction({ url: data.url, key: data.key });
			if ((saveRes as any)?.serverError) throw new Error('save_failed');
			onUploaded({ url: data.url, key: data.key });
			setFile(null);
			if (preview) URL.revokeObjectURL(preview);
			setPreview(null);
		} catch (e) {
			console.error(e);
			alert(t('uploadFailed'));
		} finally {
			setUploading(false);
		}
	}

	function clearSelection() {
		setFile(null);
		if (preview) URL.revokeObjectURL(preview);
		setPreview(null);
		if (inputRef.current) inputRef.current.value = '';
	}

	return (
		<div className='flex items-start gap-4'>
			<div className='size-20 relative rounded overflow-hidden bg-muted'>
				{preview ? (
					// Local preview
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={preview}
						alt='preview'
						className='object-cover w-full h-full'
					/>
				) : currentUrl ? (
					<Image
						src={currentUrl}
						alt='avatar'
						fill
						sizes='80px'
						className='object-cover'
					/>
				) : null}
			</div>
			<div className='flex flex-col gap-2'>
				<div className='flex gap-2'>
					<Button
						type='button'
						variant='secondary'
						onClick={onPick}
						disabled={disabled || uploading}>
						{currentUrl || preview ? t('changeImage') : t('selectFile')}
					</Button>
					{file ? (
						<Button
							type='button'
							onClick={doUpload}
							disabled={disabled || uploading}>
							{uploading ? t('uploading') : t('upload')}
						</Button>
					) : null}
					{preview ? (
						<Button
							type='button'
							variant='ghost'
							onClick={clearSelection}
							disabled={disabled || uploading}>
							{t('remove')}
						</Button>
					) : null}
				</div>
				<Input
					ref={inputRef}
					type='file'
					accept={accept}
					className='hidden'
					onChange={onFileChange}
					disabled={disabled || uploading}
				/>
				<div className='text-xs text-muted-foreground'>{t('hint')}</div>
			</div>
		</div>
	);
}
