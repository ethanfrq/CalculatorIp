document.getElementById("inputMode").addEventListener("change", function () {
    const mode = this.value;
    document.getElementById("cidrInput").classList.toggle("hidden", mode !== "cidr");
    document.getElementById("maskInput").classList.toggle("hidden", mode !== "mask");
});

document.getElementById("subnetForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const mode = document.getElementById("inputMode").value;
    const ip = document.getElementById("ip").value;
    const cidr = mode === "cidr" ? parseInt(document.getElementById("cidr").value, 10) : null;
    const mask = mode === "mask" ? document.getElementById("mask").value : null;

    if (!validateIP(ip)) {
        alert("Adresse IP invalide !");
        return;
    }

    let subnetMask = mask;
    if (mode === "cidr") {
        if (cidr < 0 || cidr > 32) {
            alert("CIDR doit être entre 0 et 32 !");
            return;
        }
        subnetMask = calculateSubnetMask(cidr);
    } else {
        if (!validateSubnetMask(mask)) {
            alert("Masque de sous-réseau invalide !");
            return;
        }
    }

    const binaryMask = convertToBinaryMask(subnetMask);
    const networkAddress = calculateNetworkAddress(ip, subnetMask);
    const broadcastAddress = calculateBroadcastAddress(networkAddress, subnetMask);
    const totalHosts = Math.pow(2, 32 - (cidr || calculateCIDRFromMask(mask)));
    const usableHosts = totalHosts > 2 ? totalHosts - 2 : 0;
    const [firstUsableIP, lastUsableIP] = calculateUsableRange(networkAddress, broadcastAddress);
    const ipClass = determineIPClass(ip);
    const defaultGateway = firstUsableIP;

    // Nouveaux calculs
    const cidrValue = cidr || calculateCIDRFromMask(mask);
    const subnetBits = cidrValue - (ipClass.startsWith("Classe A") ? 8 : ipClass.startsWith("Classe B") ? 16 : 24);
    const hostBits = 32 - cidrValue;
    const numberOfSubnets = Math.pow(2, subnetBits);
    const networkAddressInt = ipToInt(networkAddress);
    const broadcastAddressInt = ipToInt(broadcastAddress);

    // Convert addresses for binary display
    const networkAddressBin = convertToBinary(networkAddressInt, 32);
    const broadcastAddressBin = convertToBinary(broadcastAddressInt, 32);

    updateResults({
        ip,
        subnetMask,
        binaryMask,
        networkAddress,
        broadcastAddress,
        usableRange: `${firstUsableIP} - ${lastUsableIP}`,
        totalHosts,
        usableHosts,
        ipClass,
        defaultGateway,
        subnetBits,
        numberOfSubnets,
        hostBits,
        networkAddressBin,
        broadcastAddressBin,
    });

    if (document.getElementById("showIPs").checked) {
        const ipList = calculateIPList(firstUsableIP, lastUsableIP);
        displayIPList(ipList);
    }
});

function validateIP(ip) {
    const regex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
    return regex.test(ip);
}

function validateSubnetMask(mask) {
    const regex = /^(255|254|252|248|240|224|192|128|0)\.(255|254|252|248|240|224|192|128|0)\.(255|254|252|248|240|224|192|128|0)\.(255|254|252|248|240|224|192|128|0)$/;
    return regex.test(mask);
}

function calculateSubnetMask(cidr) {
    return Array(4)
        .fill(0)
        .map((_, i) =>
            (cidr - i * 8 > 0 ? Math.min(255, 256 - Math.pow(2, Math.max(0, 8 - cidr + i * 8))) : 0).toString()
        )
        .join(".");
}

function calculateCIDRFromMask(mask) {
    return mask
        .split(".")
        .map(octet => parseInt(octet, 10).toString(2).split("1").length - 1)
        .reduce((sum, ones) => sum + ones, 0);
}

function convertToBinaryMask(mask) {
    return mask
        .split(".")
        .map(octet => parseInt(octet, 10).toString(2).padStart(8, "0"))
        .join(".");
}

function calculateNetworkAddress(ip, subnetMask) {
    const ipParts = ip.split(".").map(Number);
    const maskParts = subnetMask.split(".").map(Number);

    return ipParts.map((part, i) => part & maskParts[i]).join(".");
}

function calculateBroadcastAddress(networkAddress, subnetMask) {
    const networkParts = networkAddress.split(".").map(Number);
    const maskParts = subnetMask.split(".").map(Number).map(m => 255 - m);

    return networkParts.map((part, i) => part | maskParts[i]).join(".");
}

function calculateUsableRange(networkAddress, broadcastAddress) {
    const networkParts = networkAddress.split(".").map(Number);
    const broadcastParts = broadcastAddress.split(".").map(Number);

    const firstUsableIP = [...networkParts];
    const lastUsableIP = [...broadcastParts];

    if (firstUsableIP[3] < 255) firstUsableIP[3] += 1;
    if (lastUsableIP[3] > 0) lastUsableIP[3] -= 1;

    return [firstUsableIP.join("."), lastUsableIP.join(".")];
}

function determineIPClass(ip) {
    const firstOctet = parseInt(ip.split(".")[0], 10);

    if (firstOctet >= 1 && firstOctet <= 126) return "Classe A";
    if (firstOctet >= 128 && firstOctet <= 191) return "Classe B";
    if (firstOctet >= 192 && firstOctet <= 223) return "Classe C";
    if (firstOctet >= 224 && firstOctet <= 239) return "Classe D (Multicast)";
    if (firstOctet >= 240 && firstOctet <= 255) return "Classe E (Expérimental)";

    return "Classe inconnue";
}

function calculateIPList(firstUsableIP, lastUsableIP) {
    const start = ipToInt(firstUsableIP);
    const end = ipToInt(lastUsableIP);
    const ipList = [];
    for (let i = start; i <= end; i++) {
        ipList.push(intToIp(i));
    }
    return ipList;
}

function displayIPList(ipList) {
    const ipListSection = document.getElementById("ipListSection");
    const ipListElement = document.getElementById("ipList");
    ipListElement.innerHTML = ipList.map(ip => `<li>${ip}</li>`).join("");
    ipListSection.classList.remove("hidden");
}

function ipToInt(ip) {
    return ip.split(".").reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0);
}

function intToIp(int) {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join(".");
}

function convertToBinary(value, bits) {
    return value
        .toString(2)
        .padStart(bits, "0")
        .match(/.{1,8}/g)
        .join(".");
}

function updateResults(data) {
    document.getElementById("resultSection").classList.remove("hidden");

    document.getElementById("ipValue").textContent = data.ip;
    document.getElementById("subnetMask").textContent = data.subnetMask;
    document.getElementById("binaryMask").textContent = data.binaryMask;
    document.getElementById("networkAddress").textContent = data.networkAddress;
    document.getElementById("broadcastAddress").textContent = data.broadcastAddress;
    document.getElementById("usableRange").textContent = data.usableRange;
    document.getElementById("totalHosts").textContent = data.totalHosts;
    document.getElementById("usableHosts").textContent = data.usableHosts;
    document.getElementById("ipClass").textContent = data.ipClass;
    document.getElementById("defaultGateway").textContent = data.defaultGateway;
    document.getElementById("subnetBits").textContent = data.subnetBits;
    document.getElementById("numberOfSubnets").textContent = data.numberOfSubnets;
    document.getElementById("hostBits").textContent = data.hostBits;
    document.getElementById("networkAddressBin").textContent = data.networkAddressBin;
    document.getElementById("broadcastAddressBin").textContent = data.broadcastAddressBin;
}
