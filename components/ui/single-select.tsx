import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command';

export interface SingleSelectOption {
	label: string;
	value: string;
	disabled?: boolean;
}

interface SingleSelectProps {
	options: SingleSelectOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function SingleSelect({
	options,
	value,
	onChange,
	placeholder = 'Select option',
	className,
	disabled = false,
}: SingleSelectProps) {
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

	const selectedOption = options.find((opt) => opt.value === value);

	const handleSelect = (optionValue: string) => {
		if (disabled) return;
		const option = options.find((opt) => opt.value === optionValue);
		if (option?.disabled) return;
		onChange(optionValue);
		setIsPopoverOpen(false);
	};

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={isPopoverOpen}
					disabled={disabled}
					className={cn(
						'flex h-9 w-full items-center justify-between text-muted-foreground bg-transparent px-3 py-2 text-sm',
						disabled && 'opacity-50 cursor-not-allowed',
						className
					)}
				>
					<span className={cn(
						'text-sm truncate',
						!selectedOption && 'text-muted-foreground'
					)}>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
				<Command>
					<CommandList className='max-h-[300px]'>
						<CommandEmpty>No option found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = option.value === value;
								return (
									<CommandItem
										key={option.value}
										onSelect={() => handleSelect(option.value)}
										disabled={option.disabled}
										className={cn(
											'cursor-pointer',
											option.disabled && 'opacity-50 cursor-not-allowed'
										)}
									>
										<span className={cn(isSelected && 'font-medium')}>
											{option.label}
										</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup>
							<CommandItem
								onSelect={() => setIsPopoverOpen(false)}
								className='justify-center cursor-pointer'
							>
								Close
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
