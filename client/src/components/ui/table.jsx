import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = ({ className, ...props }) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
)
const TableHeader = ({ className, ...props }) => <thead className={cn('[&_tr]:border-b', className)} {...props} />
const TableBody = ({ className, ...props }) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
const TableRow = ({ className, ...props }) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
)
const TableHead = ({ className, ...props }) => (
  <th className={cn('h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-muted-foreground', className)} {...props} />
)
const TableCell = ({ className, ...props }) => (
  <td className={cn('p-2 align-middle whitespace-nowrap', className)} {...props} />
)

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
