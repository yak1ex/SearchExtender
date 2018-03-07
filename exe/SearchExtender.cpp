#include <windows.h>

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrevInst, LPSTR lpszCmdLine, int nCmdShow)
{
	MessageBox(NULL, lpszCmdLine, "Called", MB_OK);
	return 0;
}
