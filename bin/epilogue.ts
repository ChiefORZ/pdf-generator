const examples = [
  {
    description: 'Generate a PDF from a URL using pipe',
    example:
      '$0 https://google.com -c "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" > ./google.pdf',
  },
  {
    description: 'Generate a PDF from a URL  on the desired path',
    example:
      '$0 https://google.com  -c "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" -o ./google.pdf',
  },
  {
    description: 'Generate a PDF from a statically built website',
    example:
      '$0 ./my-website -c "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" -o ./website.pdf',
  },
];

export const epilogue = `
Examples:
${examples
  .map(
    ({ example, description }) => `
- ${description}
${example
  .split('\n')
  .map((line) => `     ${line}`)
  .join('\n')}
`
  )
  .join('')}
For more details, visit https://github.com/ChiefORZ/pdf-generator
`;
