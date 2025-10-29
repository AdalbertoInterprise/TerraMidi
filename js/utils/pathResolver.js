(function registerTerraPathResolver(global) {
    if (typeof global === 'undefined') {
        return;
    }

    const REPO_SEGMENT = '/TerraMidi';

    function computeBasePath() {
        try {
            const { pathname } = global.location || { pathname: '' };
            if (!pathname) {
                return '';
            }

            if (pathname === REPO_SEGMENT || pathname.startsWith(`${REPO_SEGMENT}/`) || pathname.startsWith(`${REPO_SEGMENT}?`)) {
                return REPO_SEGMENT;
            }

            if (pathname.includes(`${REPO_SEGMENT}/`)) {
                return REPO_SEGMENT;
            }

            if (pathname.endsWith('TerraMidi')) {
                return REPO_SEGMENT;
            }
        } catch (error) {
            // Ambiente sem location (ex.: testes) permanece com base vazia
        }
        return '';
    }

    const namespace = global.__terra ?? (global.__terra = {});

    if (typeof namespace.basePath === 'undefined') {
        namespace.basePath = computeBasePath();
    }

    namespace.getBasePath = function getBasePath() {
        return namespace.basePath || '';
    };

    namespace.setBasePath = function setBasePath(newBasePath) {
        if (typeof newBasePath !== 'string') {
            return;
        }
        let normalized = newBasePath.trim();
        if (normalized && !normalized.startsWith('/')) {
            normalized = `/${normalized}`;
        }
        if (normalized.endsWith('/') && normalized !== '/') {
            normalized = normalized.slice(0, -1);
        }
        namespace.basePath = normalized === '/' ? '' : normalized;
    };

    function normalizeSlashes(value) {
        if (!value) {
            return value;
        }
        return value.replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    namespace.stripBasePath = function stripBasePath(input) {
        if (typeof input !== 'string' || !input) {
            return input || '';
        }

        let path = input.replace(global.location?.origin || '', '');
        const base = namespace.getBasePath();

        if (base && path.startsWith(`${base}/`)) {
            path = path.substring(base.length);
        }

        if (path.startsWith(`${REPO_SEGMENT}/`)) {
            path = path.substring(REPO_SEGMENT.length);
        } else if (path === REPO_SEGMENT) {
            path = '';
        }

        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        return path === '//' ? '/' : normalizeSlashes(path);
    };

    namespace.resolvePath = function resolvePath(input) {
        if (input == null) {
            const base = namespace.getBasePath();
            return base || '/';
        }

        if (typeof input !== 'string') {
            return input;
        }

        const trimmed = input.trim();

        if (!trimmed) {
            const base = namespace.getBasePath();
            return base || '/';
        }

        if (/^(https?:|data:|blob:|\/\/)/i.test(trimmed)) {
            return trimmed;
        }

        let path = trimmed.replace(global.location?.origin || '', '');

        if (path.startsWith('./')) {
            path = path.slice(1);
        }

        if (path.startsWith(`${REPO_SEGMENT}/`)) {
            path = path.substring(REPO_SEGMENT.length);
        } else if (path === REPO_SEGMENT) {
            path = '';
        }

        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        const base = namespace.getBasePath();
        if (!base) {
            return path === '//' ? '/' : normalizeSlashes(path);
        }

        const sanitizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        const combined = `${sanitizedBase}${path}`;
        return normalizeSlashes(combined === '' ? '/' : combined);
    };
})(typeof window !== 'undefined' ? window : this);
