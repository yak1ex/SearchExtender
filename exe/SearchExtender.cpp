#define _WIN32_WINNT 0x0601
#include <windows.h>
#include <Shellapi.h>
#include <Shlwapi.h>
#include <Strsafe.h>

#include <vector>

// TODO: Use message resource

const char SCHEME_KEY[] = "SearchExtender";
const char URL_NAME[] = "URL Protocol";
const char COMMAND_KEY[] = "SearchExtender\\shell\\open\\command";
const char APP_NAME[] = "SearchExtender";
const WCHAR APP_WNAME[] = L"SearchExtender";

// http://eternalwindows.jp/security/securitycontext/securitycontext03.html

enum class AdminState {
	ADMIN, ADMIN_IN_UAC, OTHER
};

AdminState GetAdminState()
{
	HANDLE hToken;
	DWORD dwLength;
	PTOKEN_GROUPS pTokenGroups;
	PSID pSidAdministrators;
	SID_IDENTIFIER_AUTHORITY sidIdentifier = SECURITY_NT_AUTHORITY;

	AllocateAndInitializeSid(&sidIdentifier, 2, SECURITY_BUILTIN_DOMAIN_RID, DOMAIN_ALIAS_RID_ADMINS, 0, 0, 0, 0, 0, 0, &pSidAdministrators);

	if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &hToken)) {
		return AdminState::OTHER;
	}
	GetTokenInformation(hToken, TokenGroups, NULL, 0, &dwLength);
	pTokenGroups = (PTOKEN_GROUPS)LocalAlloc(LPTR, dwLength);
	GetTokenInformation(hToken, TokenGroups, pTokenGroups, dwLength, &dwLength);

	AdminState ret = AdminState::OTHER;
	for (int i = 0; i < pTokenGroups->GroupCount; i++) {
		if (EqualSid(pTokenGroups->Groups[i].Sid, pSidAdministrators)) {
			ret = (pTokenGroups->Groups[i].Attributes & SE_GROUP_ENABLED) ? AdminState::ADMIN : AdminState::ADMIN_IN_UAC;
		}
	}

	LocalFree(pTokenGroups);
	CloseHandle(hToken);
	FreeSid(pSidAdministrators);
	return ret;
}

BOOL ShowElevationConfirmation(LPCSTR lpszText, LPCSTR lpszCaption)
{
	SHSTOCKICONINFO ssii = { sizeof(SHSTOCKICONINFO) };
	BOOL ret = FALSE;
	if(SUCCEEDED(SHGetStockIconInfo(SIID_SHIELD, SHGSI_ICONLOCATION, &ssii))) {
		HMODULE hModule = LoadLibraryW(ssii.szPath);
		MSGBOXPARAMS mbp = { sizeof(MSGBOXPARAMS) };
		mbp.hInstance = hModule;
		mbp.lpszText = lpszText;
		mbp.lpszCaption = lpszCaption;
		mbp.dwStyle = MB_YESNO | MB_DEFBUTTON2 | MB_USERICON;
		mbp.lpszIcon = MAKEINTRESOURCE(-ssii.iIcon);
		ret = MessageBoxIndirect(&mbp) == IDYES;
		FreeLibrary(hModule);
	}
	return ret;
}

void ExecuteWithElevation()
{
	char szModulePath[MAX_PATH];

	GetModuleFileName(NULL, szModulePath, sizeof(szModulePath));
	ShellExecute(NULL, "runas", szModulePath, NULL, NULL, SW_SHOWNORMAL); // will show UAC dialog
}

BOOL IsInstalledHandler()
{
	auto ret1 = RegGetValue(HKEY_CLASSES_ROOT, SCHEME_KEY, URL_NAME, RRF_RT_REG_SZ, 0, 0, 0);
	auto ret2 = RegGetValue(HKEY_CLASSES_ROOT, COMMAND_KEY, 0, RRF_RT_REG_SZ, 0, 0, 0);
	return ret1 == ERROR_SUCCESS && ret2 == ERROR_SUCCESS;
}

void InstallHandler()
{
	HKEY hkey;
	LONG ret = RegCreateKeyEx(HKEY_CLASSES_ROOT, SCHEME_KEY, 0, 0, 0, KEY_ALL_ACCESS, 0, &hkey, 0);
	if(ret == ERROR_SUCCESS) {
		ret = RegSetValueEx(hkey, URL_NAME, 0, REG_SZ, reinterpret_cast<const BYTE*>(""), 1);
	}
	if(ret == ERROR_SUCCESS) {
		RegCloseKey(hkey);
		ret = RegCreateKeyEx(HKEY_CLASSES_ROOT, COMMAND_KEY, 0, 0, 0, KEY_ALL_ACCESS, 0, &hkey, 0);
	}
	if(ret == ERROR_SUCCESS) {
		char szModulePath[MAX_PATH];
		GetModuleFileName(NULL, szModulePath, sizeof(szModulePath));
		char szCmdLine[4096];
		StringCbPrintf(szCmdLine, sizeof(szCmdLine), "\"%s\" %%1", szModulePath);
		ret = RegSetValueEx(hkey, 0, 0, REG_SZ, reinterpret_cast<const BYTE*>(szCmdLine), lstrlen(szCmdLine)+1);
	}
	if(ret == ERROR_SUCCESS) {
		MessageBox(0, "URL protocol handler is successfully installed ", APP_NAME, MB_ICONEXCLAMATION | MB_OK);
	} else {
		LPSTR lpMsgBuf;
		FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, 0, GetLastError(), MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), reinterpret_cast<LPSTR>(&lpMsgBuf), 0, 0 );
		char szBuf[4096];
		StringCbPrintf(szBuf, sizeof(szBuf), "Installing URL protocol handler failed:\n%s", lpMsgBuf);
		LocalFree(lpMsgBuf);
		MessageBox(0, szBuf, APP_NAME, MB_ICONERROR | MB_OK);
	}
}

void UninstallHandler()
{
	if(SHDeleteKey(HKEY_CLASSES_ROOT, SCHEME_KEY) == ERROR_SUCCESS) {
		MessageBox(0, "URL protocol handler is successfully uninstalled ", APP_NAME, MB_ICONEXCLAMATION | MB_OK);
	} else {
		LPSTR lpMsgBuf;
		FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, 0, GetLastError(), MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), reinterpret_cast<LPSTR>(&lpMsgBuf), 0, 0 );
		char szBuf[4096];
		StringCbPrintf(szBuf, sizeof(szBuf), "Uninstalling URL protocol handler failed:\n%s", lpMsgBuf);
		LocalFree(lpMsgBuf);
		MessageBox(0, szBuf, APP_NAME, MB_ICONERROR | MB_OK);
	}
}

void SetupHandler()
{
	switch(GetAdminState()) {
	case AdminState::ADMIN:
		if(IsInstalledHandler()) {
			UninstallHandler();
		} else {
			InstallHandler();
		}
		break;
	case AdminState::ADMIN_IN_UAC:
		if(ShowElevationConfirmation(
				IsInstalledHandler() ?
					"To uninstall URL protocol handler,\ndo you want to promote user rights?\n(If yes pressed, UAC dialog will be shown)" :
					"To install URL protocol handler,\ndo you want to promote user rights?\n(If yes pressed, UAC dialog will be shown)",
		 		APP_NAME)) {
			ExecuteWithElevation();
		}
		break;
	case AdminState::OTHER:
		MessageBox(0, "To install/uninstall URL protocol handler,\nyou need to run this program as a user in Administrators group", "SearchExtender", MB_ICONERROR | MB_OK);
		break;
	}
}

inline unsigned char Conv(char c)
{
	if('A' <= c && c <= 'Z') return c - 'A';
	if('a' <= c && c <= 'z') return c - 'a' + 26;
	if('0' <= c && c <= '9') return c - '0' + 52;
	if(c == '-') return 62;
	if(c == '_') return 63;
	return 64;
}

void InvokeURL(LPSTR lpszURL)
{
	std::vector<unsigned char> buf;
	int nBits = 0;
	unsigned char ucTemp = 0;
	while(*lpszURL) {
		unsigned char uc = Conv(*lpszURL);
		if(uc != 64) {
			if(nBits >= 2) {
				buf.push_back((ucTemp << (8 - nBits)) + (uc >> (nBits - 2)));
				ucTemp = uc & ((1 << (nBits - 2)) - 1);
				nBits -= 2;
			} else {
				ucTemp = (ucTemp << 6) + uc;
				nBits += 6;
			}
		}
		++lpszURL;
	}
	if(nBits > 0) {
		buf.push_back(ucTemp << (8 - nBits));
	}
	buf.push_back(0); buf.push_back(0); // terminator
	STARTUPINFOW si;
	ZeroMemory(&si, sizeof(si));
	si.cb = sizeof(si);
	PROCESS_INFORMATION pi;
	if(CreateProcessW(NULL, reinterpret_cast<LPWSTR>(buf.data()), 0, 0, FALSE, 0, 0, 0, &si, &pi)) {
		CloseHandle(pi.hProcess);
		CloseHandle(pi.hThread);
	} else {
		LPWSTR lpszError;
		WCHAR szBuf[8192];
		FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, 0, GetLastError(), 0, reinterpret_cast<LPWSTR>(&lpszError), 0, 0);
		StringCbPrintfW(szBuf, sizeof(szBuf), L"Execute `%s' failed:\n%s", buf.data(), lpszError);
		MessageBoxW(0, szBuf, APP_WNAME, MB_ICONERROR | MB_OK);
		LocalFree(lpszError);
	}
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrevInst, LPSTR lpszCmdLine, int nCmdShow)
{
	bool fColon = false, fFound = false;
	int nSlash = 0;
	while(!fFound && *lpszCmdLine) {
		switch(*lpszCmdLine) {
		case ':':
			nSlash = 0;
			fColon = true;
			break;
		case '/':
			if(fColon || nSlash > 0) ++nSlash;
			if(nSlash == 2) fFound = true;
			fColon = false;
			break;
		default:
			fColon = false;
			nSlash = 0;
		}
		++lpszCmdLine;
	}
	if(fFound) InvokeURL(lpszCmdLine);
	else SetupHandler();
	return 0;
}
