-- Pages / CMS content
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT DEFAULT '',
    meta_title VARCHAR(500) DEFAULT '',
    meta_description VARCHAR(1000) DEFAULT '',
    published BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    show_in_footer BOOLEAN DEFAULT false,
    footer_group VARCHAR(100) DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);

-- Insert default pages
INSERT INTO pages (slug, title, content, published, show_in_footer, footer_group, position) VALUES
('obchodne-podmienky', 'Obchodné podmienky', '<h2>Obchodné podmienky</h2><p>Tu zadajte vaše obchodné podmienky...</p>', true, true, 'info', 1),
('ochrana-osobnych-udajov', 'Ochrana osobných údajov', '<h2>Ochrana osobných údajov</h2><p>Tu zadajte informácie o spracovaní osobných údajov...</p>', true, true, 'info', 2),
('doprava-a-platba', 'Doprava a platba', '<h2>Doprava a platba</h2><p>Tu zadajte informácie o doprave a platbe...</p>', true, true, 'info', 3),
('reklamacie-a-vratenie', 'Reklamácie a vrátenie', '<h2>Reklamácie a vrátenie tovaru</h2><p>Tu zadajte reklamačný poriadok...</p>', true, true, 'info', 4),
('o-nas', 'O nás', '<h2>O nás</h2><p>Tu zadajte informácie o vašej firme...</p>', true, true, 'info', 5),
('kontakt', 'Kontakt', '<h2>Kontakt</h2><p>Email: info@profibuy.net<br>Tel: +421 900 000 000</p>', true, true, 'info', 6)
ON CONFLICT (slug) DO NOTHING;
