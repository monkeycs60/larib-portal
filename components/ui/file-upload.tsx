'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { X } from 'lucide-react';

type Props = {
	accept: string;
	maxSize: number;
	valueUrl?: string | null;
	onUploaded: (res: { url: string; key: string }) => void;
	onDeleted?: () => void;
	disabled?: boolean;
};

export function FileUpload({
	accept,
	maxSize,
	valueUrl,
	onUploaded,
	onDeleted,
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

	async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

		await uploadFile(f);
	}

	async function uploadFile(fileToUpload: File) {
		setUploading(true);
		try {
			type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
			const allowed: ReadonlyArray<AllowedMime> = [
				'image/jpeg',
				'image/png',
				'image/webp',
				'image/gif',
			];
			if (!allowed.includes(fileToUpload.type as AllowedMime)) throw new Error('invalid_type');

			const fd = new FormData();
			fd.append('file', fileToUpload);
			const res = await fetch('/api/uploads/avatar', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload_failed');
			const data = (await res.json()) as { url: string; key: string };
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
			setFile(null);
			if (preview) URL.revokeObjectURL(preview);
			setPreview(null);
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

	async function handleDelete() {
		if (!onDeleted) return;
		setUploading(true);
		try {
			const { deleteProfilePhotoAction } = await import('@/actions/avatar');
			const result = await deleteProfilePhotoAction();
			if (result?.serverError) {
				throw new Error('delete_failed');
			}
			onDeleted();
		} catch (error) {
			console.error(error);
			alert(t('uploadFailed'));
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className='flex items-start gap-4'>
			<div className='size-20 relative rounded bg-muted group'>
				{preview ? (
					// Local preview
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={preview}
						alt='preview'
						className='object-cover w-full h-full rounded'
					/>
				) : currentUrl ? (
					<>
						<Image
							src={currentUrl}
							alt='avatar'
							fill
							sizes='80px'
							className='object-cover rounded'
						/>
						{onDeleted && !disabled && !uploading && (
							<button
								type='button'
								onClick={handleDelete}
								className='absolute top-1 right-1 bg-black/50 hover:bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
							>
								<X className='w-3 h-3 text-white' />
							</button>
						)}
					</>
				) : null}
			</div>
			<div className='flex flex-col gap-2'>
				<div className='flex gap-2'>
					<Button
						type='button'
						variant='secondary'
						onClick={onPick}
						disabled={disabled || uploading}>
						{uploading ? t('uploading') : currentUrl || preview ? t('changeImage') : t('selectFile')}
					</Button>
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
