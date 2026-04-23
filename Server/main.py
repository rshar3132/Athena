from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import os 
import prac 



app = FastAPI()