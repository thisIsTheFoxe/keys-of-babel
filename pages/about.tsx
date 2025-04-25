import Head from 'next/head';
import Link from 'next/link';

export default function About() {
  return (
    <>
      <Head>
        <title>About & FAQ - Keys of Babel</title>
        <meta name="description" content="About and frequently asked questions for Keys of Babel, the Bitcoin private key library inspired by Borges' Library of Babel." />
      </Head>
      <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 700, margin: 'auto' }}>
        <h1>About / FAQ</h1>
        <div style={{ fontSize: '1.13em' }}>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>The Library of Babel</span>
            <span>
              This project is inspired by Jorge Luis Borges' legendary short story <i>The Library of Babel</i> (1941), which imagines a vast library containing every possible combination of letters in every possible book. The story is a metaphor for infinity, randomness, and the search for meaning. You can read the original story here: <a href="https://maskofreason.files.wordpress.com/2011/02/the-library-of-babel-by-jorge-luis-borges.pdf" target="_blank" rel="noopener noreferrer">English translation (PDF)</a> · <a href="http://www.literatura.us/borges/biblioteca.html" target="_blank" rel="noopener noreferrer">Texto original en español</a>. The digital <a href="https://libraryofbabel.info" target="_blank" rel="noopener noreferrer">libraryofbabel.info</a> is a modern tribute, containing every possible page of 3200 characters for exploration and reflection.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>What is Keys of Babel?</span>
            <span>
              Keys of Babel is an educational and conceptual project that maps the mathematical space of all <b>256-bit elliptic curve private keys</b>—the foundation of modern cryptography—onto a virtual library structure inspired by Borges. This space is used in Bitcoin, Ethereum, and many other cryptosystems, but the library itself is universal: it contains every possible private key, address, and potential secret that could exist within this mathematical universe.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Concept & Technology</span>
            <span>
              Every 256-bit private key is simply a number between 1 and 2<sup>256</sup>-1. Keys of Babel organizes this unimaginably vast space as if it were a library of hexagons, walls, shelves, volumes, and pages—mirroring Borges' vision and the structure at <a href="https://libraryofbabel.info" target="_blank" rel="noopener noreferrer">libraryofbabel.info</a>. The app uses modern cryptography libraries and (for Bitcoin) the Blockstream API to check balances. All key generation and searching happens locally in your browser; only public addresses are queried externally.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Is this just for Bitcoin?</span>
            <span>
              No. While the app demonstrates Bitcoin addresses, the underlying mathematics applies to any system using 256-bit elliptic curve cryptography (secp256k1), including Ethereum and many others. The library is a metaphor for the totality of possible secrets in these systems.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Is this a real wallet?</span>
            <span>
              No. This is not a wallet. It does not store or manage your coins. It is a tool for exploring the keyspace and learning about cryptography.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Can I find real Bitcoin or Ethereum with this?</span>
            <span>
              Like the librarians wandering Borges’ infinite hexagons in search of meaning, order, or a sacred text, explorers of the Keys of Babel embark on a journey through the cryptographic cosmos. Though the hope of discovering a “treasure” is as vanishingly small as finding a coherent book in the Library, the quest itself is a meditation on infinity, chance, and the mysteries hidden within mathematical order.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>How does the auto-search work?</span>
            <span>
              The app generates private keys by traversing the library's structure and queries the Blockstream API to check for Bitcoin balances. The search can be parallelized for speed, but is subject to API rate limits.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Are my inputs or searches sent anywhere?</span>
            <span>
              No. All key generation and searching happens locally in your browser. Only public addresses are queried externally (via the Blockstream API).
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Is this secure? Should I use it for real funds?</span>
            <span>
              <b>No!</b> Never use any keys or addresses generated here for storing real cryptocurrency. This is a public, open-source, educational tool.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Why Borges?</span>
            <span>
              Borges (1899–1986) was an Argentinian author whose story "The Library of Babel" is a meditation on infinity, randomness, and the search for meaning. The digital <a href="https://libraryofbabel.info" target="_blank" rel="noopener noreferrer">libraryofbabel.info</a> is a tribute to this idea, and this project brings that literary vision into the world of cryptography.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>References & Further Reading</span>
            <span>
              • Borges, J.L. <i>The Library of Babel</i> (1941): <a href="https://maskofreason.files.wordpress.com/2011/02/the-library-of-babel-by-jorge-luis-borges.pdf" target="_blank" rel="noopener noreferrer">English PDF</a> · <a href="http://www.literatura.us/borges/biblioteca.html" target="_blank" rel="noopener noreferrer">Español</a><br />
              • <a href="https://libraryofbabel.info" target="_blank" rel="noopener noreferrer">libraryofbabel.info</a> — Jonathan Basile's digital Library<br />
              • <a href="https://en.wikipedia.org/wiki/The_Library_of_Babel" target="_blank" rel="noopener noreferrer">Wikipedia: The Library of Babel</a><br />
              • <a href="https://github.com/thisIsTheFoxe/keys-of-babel" target="_blank" rel="noopener noreferrer">Source code on GitHub</a>
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>Who made this?</span>
            <span>
              This project was created by <a href="https://github.com/thisIsTheFoxe" target="_blank" rel="noopener noreferrer">thisIsTheFoxe</a>, with inspiration from Borges, Jonathan Basile, and the cryptography community.
            </span>
          </p>
          <p><span style={{ fontWeight: 600, fontSize: '1.18em', display: 'block', marginTop: 28, marginBottom: 4 }}>How can I contribute or report issues?</span>
            <span>
              Contributions and bug reports are welcome! Please open an issue or pull request on GitHub.
            </span>
          </p>
        </div>
        <footer style={{marginTop: 48, borderTop: '1px solid #ccc', paddingTop: 16, textAlign: 'center'}}>
          <Link href="/">← Back to Home</Link>
        </footer>
      </div>
    </>
  );
}
