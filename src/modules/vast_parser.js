// export default function (playerInstance, options) {

    async function mockServerRequest(url) {
        switch (url) {
            case 'root':
                return ([{ type: 'wrapper', wrapperUrl: 'wrapper1', trackingOptions: [{ click: 'wrapperRequestClick' }] }, { type: 'ad', id: 1 }, { type: 'wrapper', wrapperUrl: 'wrapper2', trackingOptions: [{ click: 'wrapperRequestClick' }] }]);
            case 'wrapper1':
                return ([{ type: 'ad', id: 2, trackingOptions: [{ click: 'wrapperResponseClick' }] }]);
            case 'wrapper2':
                return ([{ type: 'wrapper', wrapperUrl: 'wrapper3', trackingOptions: [{ click: 'wrapperMiddleResponseClick' }] }]);
            case 'wrapper3':
                return ([{ type: 'ad', id: 3, trackingOptions: [{ click: 'wrapperResponseClick' }] }]);
        }
    }

    async function resolveTreeRequests(url, baseTree = {}) {
        const tree = { ...baseTree, children: [] };
        const nodes = await mockServerRequest(url);

        for (const node of nodes) {
            if (node.type === 'ad') {
                tree.children.push(node);
            } else if (node.type === 'wrapper') {
                tree.children.push(await resolveTreeRequests(node.wrapperUrl, node));
            }
        }

        return tree;
    }

    function flattenAdTree(root, ads = [], trackingOptions = []) {
        if (Array.isArray(root.children) && root.children.length) {
            root.children.forEach(child => flattenAdTree(child, ads, [...root.trackingOptions || [], ...trackingOptions]))
        }

        if (root.type === 'ad') {
            ads.push({ ...root, trackingOptions: [...root.trackingOptions || [], ...trackingOptions] });
        }

        return ads;
    }

    /**
     * Parses VAST XML and returns ads object
     */
    function resolveVast(vastUrl) {
        return flattenAdTree(vastUrl);
    }


// console.log(JSON.stringify(resolveVast(), undefined, 2));
resolveTreeRequests('root').then(response => JSON.stringify(resolveVast(response), undefined, 2));
// }
