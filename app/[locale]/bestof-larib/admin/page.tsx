import { BestofPageContent } from '../bestof-page-content';

export default async function BestofLaribAdminPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { locale } = await params;
	const sp = await searchParams;
	return <BestofPageContent locale={locale} searchParams={sp} adminView={true} />;
}
