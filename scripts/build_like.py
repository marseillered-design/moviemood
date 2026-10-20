# Builds api/_like-data.js, the lists behind the "movies like X" / "shows like X" pages.
#
# For the most-voted films and series on TMDB it asks the site's own AI (POST /api/mood with
# like_of) which titles fans of each one love, then finds every pick on TMDB.
# AI answers are kept in scripts/like_cache.json, so a second run only asks for what is missing
# (and a run stopped half-way continues where it was). Run from the repo root:
#     python scripts/build_like.py
# The AI is the free Groq quota the site's search also uses: the script goes slowly on purpose.
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

SITE = 'https://www.themoviemood.com'
TMDB = 'https://api.themoviedb.org/3'
KEY = '838a2b872b36560920c01b7b50b0bb9e'
CACHE = 'scripts/like_cache.json'
OUT = 'api/_like-data.js'
SOURCES = [('movie', 10), ('tv', 3)]  # (type, pages of 20, most votes first)
PAUSE = 12  # seconds between AI requests
SKIP_TV_GENRES = {10763, 10764, 10767}  # news, reality, talk shows


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))


def tmdb(path, **params):
    params['api_key'] = KEY
    params.setdefault('language', 'en-US')
    return get(f'{TMDB}/{path}?{urllib.parse.urlencode(params)}')


# the same as slugify() in api/page.js
def slugify(text):
    text = unicodedata.normalize('NFD', str(text or '').lower())
    text = ''.join(ch for ch in text if not unicodedata.category(ch).startswith('M'))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')[:60]


def title_path(kind, item):
    slug = slugify(item.get('title') or item.get('name'))
    return f"/{kind}/{item['id']}" + (f'-{slug}' if slug else '')


def year_of(item):
    date = item.get('release_date') or item.get('first_air_date') or ''
    return int(date[:4]) if date[:4].isdigit() else None


def sources():
    found = []
    for kind, pages in SOURCES:
        for page in range(1, pages + 1):
            for item in tmdb(f'discover/{kind}', sort_by='vote_count.desc', page=page, include_adult='false')['results']:
                if item.get('poster_path') and not SKIP_TV_GENRES & set(item.get('genre_ids', [])):
                    found.append((kind, item))
    return found


def find_on_tmdb(pick):
    kind = 'tv' if pick.get('type') == 'tv' else 'movie'
    year_param = 'first_air_date_year' if kind == 'tv' else 'primary_release_year'
    attempts = [{year_param: pick['year']}] if pick.get('year') else []
    for extra in attempts + [{}]:
        results = tmdb(f'search/{kind}', query=pick['title'], **extra).get('results', [])
        results = [r for r in results if r.get('poster_path') and r.get('vote_count', 0) >= 50]
        if results:
            return kind, results[0]
    return None


def main():
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    data = {}
    items = sources()
    print(len(items), 'titles', flush=True)
    for n, (kind, item) in enumerate(items, 1):
        key = f"{kind}/{item['id']}"
        name = item.get('title') or item.get('name')
        if key not in cache:
            answer = {}
            for attempt in range(3):
                try:
                    answer = post(f'{SITE}/api/mood', {'like_of': {'title': name, 'year': year_of(item), 'type': kind}, 'debug': True})
                except Exception as error:
                    answer = {'_ai': str(error)}
                if answer.get('like_picks'):
                    break
                print(f'  {name}: no answer ({str(answer.get("_ai"))[:160]}), waiting', flush=True)
                time.sleep(60 * (attempt + 1))
            time.sleep(PAUSE)
            if not answer.get('like_picks'):
                continue
            cache[key] = answer['like_picks']
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

        picks, seen = [], {key}
        with ThreadPoolExecutor(8) as pool:
            hits = list(pool.map(find_on_tmdb, cache[key]))
        for hit in hits:
            if not hit or f'{hit[0]}/{hit[1]["id"]}' in seen:
                continue
            seen.add(f'{hit[0]}/{hit[1]["id"]}')
            picks.append(title_path(*hit))
        if len(picks) >= 5:
            data[key] = {'path': title_path(kind, item), 'picks': picks}
        print(f'{n}/{len(items)} {name}: {len(picks)} picks', flush=True)

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Built by scripts/build_like.py, do not edit by hand.\n')
        f.write('// For each film or series: the titles its fans love most (the AI\'s picks, found on TMDB).\n')
        f.write('export default ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('written', len(data), 'lists to', OUT)


if __name__ == '__main__':
    sys.exit(main())
