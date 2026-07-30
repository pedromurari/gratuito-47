import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface Municipio {
  nome: string;
  uf: string;
}

let cachedMunicipios: Municipio[] | null = null;
let loadingPromise: Promise<Municipio[]> | null = null;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function loadMunicipios(): Promise<Municipio[]> {
  if (cachedMunicipios) return cachedMunicipios;
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')
    .then((res) => res.json())
    .then((data: any[]) => {
      const parsed = data.map((m) => ({
        nome: m.nome as string,
        uf: (m.microrregiao?.mesorregiao?.UF?.sigla ?? '') as string,
      }));
      cachedMunicipios = parsed;
      return parsed;
    })
    .catch(() => {
      loadingPromise = null;
      return [];
    });
  return loadingPromise;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
}

const CityAutocomplete = ({ value, onChange, isInvalid }: CityAutocompleteProps) => {
  const [query, setQuery] = useState(value);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [suggestions, setSuggestions] = useState<Municipio[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMunicipios().then(setMunicipios);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    setQuery(text);
    if (value) onChange('');
    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const normalizedQuery = normalize(text);
    const matches = municipios
      .filter((m) => normalize(m.nome).startsWith(normalizedQuery))
      .slice(0, 8);
    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
  };

  const handleSelect = (m: Municipio) => {
    const formatted = `${m.nome} - ${m.uf}`;
    setQuery(formatted);
    onChange(formatted);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        type="text"
        placeholder="Digite sua cidade"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        className={`input-form w-full text-lg ${isInvalid ? 'border-red-500 focus:border-red-500' : ''}`}
        autoComplete="off"
        required
      />
      {showDropdown && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {suggestions.map((m) => (
            <li
              key={`${m.nome}-${m.uf}`}
              onClick={() => handleSelect(m)}
              className="px-4 py-2 text-left cursor-pointer hover:bg-accent/20 text-sm text-foreground"
            >
              {m.nome} - {m.uf}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;
