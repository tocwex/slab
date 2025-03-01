import * as _ABI from "./abis";

export const ABI = _ABI;

export const APP = Object.freeze({
  TAG: "%slab",
  URL: (typeof import.meta.env.BASE_URL !== "string")
    ? "/"
    : import.meta.env.BASE_URL,
  VERSION: import.meta.env.PACKAGE_VERSION,
  DEBUG: import.meta.env.MODE === "development",
});

export const BLOCKCHAIN = Object.freeze({
  ID: (Object.freeze({
    ETHEREUM: 1,
    SEPOLIA: 11155111,
  }) as {[network: string]: number;}),
  TAG: (Object.freeze({
    1: "ETHEREUM",
    11155111: "SEPOLIA",
  }) as {[network: number]: string;}),
  SYM: (Object.freeze({
    1: "ETH",
    11155111: "sepETH",
  }) as {[network: number]: string;}),
  RPC: (Object.freeze({
    ETHEREUM: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.ALCHEMY_KEY}`,
    SEPOLIA: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.ALCHEMY_KEY}`,
  }) as {[network: string]: string;}),
});

export const ACCOUNT = Object.freeze({
  NULL: (Object.freeze({
    ETHEREUM: "0x0000000000000000000000000000000000000000",
    SEPOLIA: "0x0000000000000000000000000000000000000000",
  }) as {[network: string]: `0x${string}`;}),
  AZP_L2: (Object.freeze({
    ETHEREUM: "0x1111111111111111111111111111111111111111",
    SEPOLIA: "0x1111111111111111111111111111111111111111",
  }) as {[network: string]: `0x${string}`;}),
});

export const CONTRACT = Object.freeze({
  REGISTRY: Object.freeze({ // ~tocwex.syndiate token registry
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0000000000000000000000000000000000000000", // TODO: Add real address
      SEPOLIA: "0x8c53afd9cba39a496333e6d050e584c8f37bb269",
    }) as {[network: string]: `0x${string}`;}),
    NAME: "Azimuth Points",
    SYMBOL: "AZP",
    DECIMALS: 0,
    ABI: ABI.TOCWEX_REGISTRY,
  }),
  DEPLOYER_V1: Object.freeze({ // ~tocwex.syndiate token deployer (v1)
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0000000000000000000000000000000000000000", // TODO: Add real address
      SEPOLIA: "0xcbf081e9bab6ba8fc7cc01344a1fcfc2fbe8198d",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.TOCWEX_DEPLOYER_V1,
  }),
  TOKENBOUND: Object.freeze({ // tokenbound
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x0000000000000000000000000000000000000000", // TODO: Add real address
      SEPOLIA: "0x5Ee3b4196a20aec5EECDdf57d5AB24dF3cEAdFBe",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.TOKENBOUND,
  }),
  AZP: Object.freeze({ // Azimuth
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x223c067f8cf28ae173ee5cafea60ca44c335fecb",
      SEPOLIA: "0xc982929e336c366DCf8312589b5EbaaBc8Dd36Ad",
    }) as {[network: string]: `0x${string}`;}),
    ABI: ABI.AZIMUTH,
  }),
  ECL: Object.freeze({ // Ecliptic
    ADDRESS: (Object.freeze({
      ETHEREUM: "0x33EeCbf908478C10614626A9D304bfe18B78DD73",
      SEPOLIA: "0x7ecf516D01bA166351EBb441dA1E3839D2C0e1A2",
    }) as {[network: string]: `0x${string}`;}),
    NAME: "Azimuth Points",
    SYMBOL: "AZP",
    DECIMALS: 0,
    ABI: ABI.ECLIPTIC,
  }),
  USDC: Object.freeze({
    ADDRESS: (Object.freeze({
      ETHEREUM: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      SEPOLIA: "0xB962E45F33814833744b8a102C7C626a98B32e38",
    }) as {[network: string]: `0x${string}`;}),
    NAME: "USD Coin",
    SYMBOL: "USDC",
    DECIMALS: 6,
    // NOTE: This ABI is a generic ERC20 ABI and not the actual USDC ABI
    // (which is difficult to construct/use due to it being a proxy)
    ABI: ABI.USDC,
  }),
});

export const MATH = Object.freeze({
  MAX_UINT256: BigInt("0x" + "f".repeat(256 / 4)),
});

export const SAFE = Object.freeze({
  VERSION: "1.4.1",
});

// NOTE: These base variables are split out because they're used to calculate
// multiple derived REGEX variables
// FIXME: These expressions are good, but still a bit permissive (e.g. "dozzod"
// is allowed when it ought not be); see more information here:
// https://github.com/urbit/urbit-ob/blob/master/src/internal/co.js
// const URBIT_PREFIXES: string[] = (`
//   dozmarbinwansamlitsighidfidlissogdirwacsabwissib\
//   rigsoldopmodfoglidhopdardorlorhodfolrintogsilmir\
//   holpaslacrovlivdalsatlibtabhanticpidtorbolfosdot\
//   losdilforpilramtirwintadbicdifrocwidbisdasmidlop\
//   rilnardapmolsanlocnovsitnidtipsicropwitnatpanmin\
//   ritpodmottamtolsavposnapnopsomfinfonbanmorworsip\
//   ronnorbotwicsocwatdolmagpicdavbidbaltimtasmallig\
//   sivtagpadsaldivdactansidfabtarmonranniswolmispal\
//   lasdismaprabtobrollatlonnodnavfignomnibpagsopral\
//   bilhaddocridmocpacravripfaltodtiltinhapmicfanpat\
//   taclabmogsimsonpinlomrictapfirhasbosbatpochactid\
//   havsaplindibhosdabbitbarracparloddosbortochilmac\
//   tomdigfilfasmithobharmighinradmashalraglagfadtop\
//   mophabnilnosmilfopfamdatnoldinhatnacrisfotribhoc\
//   nimlarfitwalrapsarnalmoslandondanladdovrivbacpol\
//   laptalpitnambonrostonfodponsovnocsorlavmatmipfip\
// `.replaceAll(" ", "").replaceAll("\n", "").match(/.{1,3}/g) as string[]);
// const URBIT_SUFFIXES: string[] = (`
//   zodnecbudwessevpersutletfulpensytdurwepserwylsun\
//   rypsyxdyrnuphebpeglupdepdysputlughecryttyvsydnex\
//   lunmeplutseppesdelsulpedtemledtulmetwenbynhexfeb\
//   pyldulhetmevruttylwydtepbesdexsefwycburderneppur\
//   rysrebdennutsubpetrulsynregtydsupsemwynrecmegnet\
//   secmulnymtevwebsummutnyxrextebfushepbenmuswyxsym\
//   selrucdecwexsyrwetdylmynmesdetbetbeltuxtugmyrpel\
//   syptermebsetdutdegtexsurfeltudnuxruxrenwytnubmed\
//   lytdusnebrumtynseglyxpunresredfunrevrefmectedrus\
//   bexlebduxrynnumpyxrygryxfeptyrtustyclegnemfermer\
//   tenlusnussyltecmexpubrymtucfyllepdebbermughuttun\
//   bylsudpemdevlurdefbusbeprunmelpexdytbyttyplevmyl\
//   wedducfurfexnulluclennerlexrupnedlecrydlydfenwel\
//   nydhusrelrudneshesfetdesretdunlernyrsebhulryllud\
//   remlysfynwerrycsugnysnyllyndyndemluxfedsedbecmun\
//   lyrtesmudnytbyrsenwegfyrmurtelreptegpecnelnevfes\
// `.replaceAll(" ", "").replaceAll("\n", "").match(/.{1,3}/g) as string[]);
// const URBIT_GALAXY_REGEX: string =
//   `(${URBIT_SUFFIXES.map(s => `(${s})`).join("|")})`;
// const URBIT_STAR_REGEX: string =
//   `((${URBIT_PREFIXES.map(s => `(${s})`).join("|")})${URBIT_GALAXY_REGEX})`;
// FIXME: These expressions are slightly worse than the above, but
// are way simpler and faster to use as <input> regex patterns.
const URBIT_GALAXY_REGEX: string =
  `[bdfhlmnprstwz][eouy][bcdfglmnprstvx]`;
const URBIT_STAR_REGEX: string =
  `[bdfhlmnprstw][aio][bcdfglmnprstvz]${URBIT_GALAXY_REGEX}`;
const URBIT_PLANET_REGEX: string =
  `(${URBIT_STAR_REGEX}-${URBIT_STAR_REGEX})`;
const URBIT_POINT_REGEX: string =
  `(${URBIT_GALAXY_REGEX}|${URBIT_STAR_REGEX}|${URBIT_PLANET_REGEX})`;

const ETHEREUM_ADDRESS_REGEX: string = `(0x[0-9a-fA-F]{40})`;
// NOTE: https://stackoverflow.com/a/30007882
const ETHEREUM_DOMAIN_REGEX: string =
  `((?:[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?\.)+eth)`;

export const REGEX = Object.freeze({
  AZIMUTH: (Object.freeze({
    GALAXY: `~${URBIT_GALAXY_REGEX}`,
    STAR: `~${URBIT_STAR_REGEX}`,
    PLANET: `~${URBIT_PLANET_REGEX}`,
    // MOON: ...
    // COMET: ...
    POINT: `~${URBIT_POINT_REGEX}`,
    // IDENTITY: ...
  }) as {[point: string]: string;}),
  ETHEREUM: (Object.freeze({
    ADDRESS: ETHEREUM_ADDRESS_REGEX,
    DOMAIN: ETHEREUM_DOMAIN_REGEX,
    RECIPIENT: `(${ETHEREUM_ADDRESS_REGEX}|${ETHEREUM_DOMAIN_REGEX})`,
  }) as {[point: string]: string;}),
  SYNDICATE: (Object.freeze({
    // NOTE: https://stackoverflow.com/a/60782571
    NAME: "^(?!\\s)(?![\\s\\S]*\\s$)[0-9a-zA-Z ~\\-]{1,50}$",
    TOKEN: "^[0-9A-Z~\\-]{1,16}$",
  }) as {[param: string]: string;}),
  DOMAIN: "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$",
  RECIPIENT: `((~${URBIT_POINT_REGEX})|${ETHEREUM_ADDRESS_REGEX}|${ETHEREUM_DOMAIN_REGEX})`,
});

export const ERROR = Object.freeze({
  INVALID_QUERY: "Query was invoked without proper preconditions.",
  INVALID_URBIT: "Query was invoked on an invalid Urbit ID.",
});
