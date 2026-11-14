/** In-game data credits (PLAN §4.6). Toggle with C. */
export class Credits {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'credits';
    this.el.hidden = true;
    this.el.innerHTML = `
      <h3>Credits</h3>
      <p><b>Lokki</b> · code MIT licence</p>
      <p>Buildings, streets, parks and coastline: <b>City of Helsinki open data</b> (Kiinteistö- ja rakennusrekisteri, Yleisten alueiden rekisteri, Maavesi), licence <b>CC BY 4.0</b>, © Helsingin kaupunki.</p>
      <p>Music (public domain / CC0 recordings via Wikimedia Commons): Mendelssohn, <i>The Hebrides</i> (Musopen Symphony Orchestra); Satie, <i>Gymnopédie no. 1</i> (Robin Alciatore); Joplin, <i>Maple Leaf Rag</i> (US Air Force Band Strolling Strings); Offenbach, <i>Galop infernal</i> (Gnissah).</p>
      <p>Sound effects: synthesised in your browser. No sample files.</p>
      <p><i>Press C to close</i></p>`;
    root.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(): void {
    this.el.hidden = !this.el.hidden;
  }
}
