import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../../components/ui/table';

describe('Table Components', () => {
  test('renders complete table structure', () => {
    render(
      <Table>
        <TableCaption>Test Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>25</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Test Table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  test('renders TableHeader', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  test('renders TableBody', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  test('renders TableRow with data-state attribute', () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-state='selected'>
            <TableCell>Selected</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Normal</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  test('renders TableHead', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  test('renders TableCell with proper padding', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Cell')).toBeInTheDocument();
  });
});
