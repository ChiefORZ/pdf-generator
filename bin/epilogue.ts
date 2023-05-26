const examples = [
  {
    description: 'Generate a PDF from a URL using pipe',
    example: '$0 https://google.com > ./google.pdf',
  },
  {
    description: 'Generate a PDF from a URL  on the desired path',
    example: '$0 https://google.com  -o ./google.pdf',
  },
  {
    description: 'Generate a PDF from a statically built website',
    example: '$0 ./my-website -o ./website.pdf',
  },
  {
    description:
      'Additional command line arguments can be passed to the browser instance using the --puppeteer-args option. For example, to run the browser in headless mode',
    example: '$0 https://google.com --puppeteer-args="--headless"',
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
