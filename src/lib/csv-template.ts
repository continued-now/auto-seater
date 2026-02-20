const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'RSVP', 'Dietary', 'Notes'];

const EXAMPLE_ROWS = [
  ['Jane Smith', 'jane@example.com', '+1 555-0101', 'Confirmed', 'Vegetarian', 'Plus one'],
  ['John Doe', 'john@example.com', '+1 555-0202', 'Pending', 'Gluten-Free', ''],
];

export function downloadCSVTemplate() {
  const lines = [
    TEMPLATE_HEADERS.join(','),
    ...EXAMPLE_ROWS.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ];
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'guest-list-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
